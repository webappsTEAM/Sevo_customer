from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from companies.models import Company
from service_requests.models import ServiceRequest
from customer_analytics.models import CustomerIdentity, CustomerLoginEvent, BookingStatusEvent, AuditLog
from customer_analytics.constants import PENDING_STATUSES, COMPLETED_STATUSES

User = get_user_model()


class CustomerAnalyticsTests(APITestCase):

    def setUp(self):
        # 1. Create a tenant company
        self.company = Company.objects.create(
            company_name="Test Company",
            slug="test-company",
            display_id="TESTCO"
        )

        # 2. Create users
        self.admin_user = User.objects.create_superuser(
            username="admin_user",
            email="admin@test.com",
            password="testpassword123",
            role="admin",
            company=self.company
        )
        self.customer_user_1 = User.objects.create_user(
            username="cust_1",
            email="cust1@test.com",
            password="custpassword123",
            role="customer",
            phone="9876543210",
            company=self.company
        )
        self.customer_user_2 = User.objects.create_user(
            username="cust_2",
            email="cust2@test.com",
            password="custpassword123",
            role="customer",
            phone="+91 9876543210",  # Different raw string but same E.164!
            company=self.company
        )

        # Ensure identities exist (created by signal or manual)
        self.identity_1, _ = CustomerIdentity.objects.get_or_create(
            user=self.customer_user_1,
            company=self.company,
            defaults={"phone_normalized": "+919876543210", "email_normalized": "cust1@test.com"}
        )
        self.identity_2, _ = CustomerIdentity.objects.get_or_create(
            user=self.customer_user_2,
            company=self.company,
            defaults={"phone_normalized": "+919876543210", "email_normalized": "cust2@test.com"}
        )

        # Force authentication as admin
        self.client.force_authenticate(user=self.admin_user)

    def test_booking_status_transition_logging(self):
        """
        Tests that saving a ServiceRequest creates a BookingStatusEvent.
        """
        # Create a booking
        booking = ServiceRequest.objects.create(
            request_id="SR-UNIT-TEST",
            customer=self.customer_user_1,
            company=self.company,
            status="new_request",
            total_amount=500.0,
            preferred_date="2026-08-18"
        )

        # Update status
        booking.status = "confirmed"
        booking.save()

        # Check that BookingStatusEvent was logged
        events = BookingStatusEvent.objects.filter(service_request=booking)
        self.assertTrue(events.exists())
        event = events.first()
        self.assertEqual(event.from_status, "new_request")
        self.assertEqual(event.to_status, "confirmed")

    def test_customer_list_view(self):
        """
        Tests GET /api/customers/ endpoint.
        """
        # Create a booking to populate stats
        ServiceRequest.objects.create(
            request_id="SR-LIST-TEST",
            customer=self.customer_user_1,
            company=self.company,
            status="completed",
            payment_status="paid",
            total_amount=1200.0,
            preferred_date="2026-08-18"
        )

        url = reverse("customer-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertGreaterEqual(len(res.data["data"]["results"]), 1)

    def test_customer_detail_view(self):
        """
        Tests GET /api/customers/<id>/ endpoint.
        """
        url = reverse("customer-detail", kwargs={"pk": self.identity_1.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["data"]["profile"]["username"], "cust_1")

    def test_customer_timeline_view(self):
        """
        Tests GET /api/customers/<id>/timeline/ endpoint.
        """
        # Create timeline activity
        CustomerLoginEvent.objects.create(
            customer=self.customer_user_1,
            method="otp",
            status="success"
        )

        url = reverse("customer-timeline", kwargs={"pk": self.identity_1.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertGreaterEqual(len(res.data["data"]), 1)

    def test_customer_analytics_view(self):
        """
        Tests GET /api/customers/analytics/ endpoint.
        """
        url = reverse("customer-analytics")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertIn("summary", res.data["data"])

    def test_customer_payments_view(self):
        """
        Tests GET /api/customers/payments/ endpoint.
        """
        url = reverse("customer-payments")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertIn("owes", res.data["data"])

    def test_customer_export_view(self):
        """
        Tests GET /api/customers/export/ endpoint.
        """
        url = reverse("customer-export")
        
        # Test CSV export
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res["Content-Type"], "text/csv")
        self.assertTrue(res.has_header("Content-Disposition"))

        # Test PDF export
        res_pdf = self.client.get(f"{url}?export_format=pdf")
        self.assertEqual(res_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pdf["Content-Type"], "application/pdf")
        self.assertTrue(res_pdf.has_header("Content-Disposition"))

    def test_customer_merge_and_unmerge(self):
        """
        Tests POST /api/customers/merges/ and unmerge endpoints.
        """
        # Merge identity_2 into identity_1
        url_merge = reverse("customer-merges")
        res_merge = self.client.post(url_merge, {
            "source_id": self.identity_2.pk,
            "target_id": self.identity_1.pk,
            "note": "Unit test merge"
        }, format="json")

        self.assertEqual(res_merge.status_code, status.HTTP_200_OK)
        self.assertTrue(res_merge.data["success"])

        # Check target references merged source
        self.identity_2.refresh_from_db()
        self.assertEqual(self.identity_2.merged_into, self.identity_1)

        # Unmerge
        url_unmerge = reverse("customer-unmerge")
        res_unmerge = self.client.post(url_unmerge, {
            "identity_id": self.identity_2.pk
        }, format="json")

        self.assertEqual(res_unmerge.status_code, status.HTTP_200_OK)
        self.assertTrue(res_unmerge.data["success"])

        self.identity_2.refresh_from_db()
        self.assertIsNone(self.identity_2.merged_into)

    def test_delete_account_anonymization(self):
        """
        Tests that DeleteAccountView anonymizes instead of cascade deleting.
        """
        # Force authentication as customer_user_1 to delete own account
        self.client.force_authenticate(user=self.customer_user_1)

        # Create dummy logs to test cleanup/anonymization
        CustomerLoginEvent.objects.create(
            customer=self.customer_user_1,
            method="otp",
            status="success",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0"
        )
        ServiceRequest.objects.create(
            request_id="SR-DEL-TEST",
            customer=self.customer_user_1,
            company=self.company,
            customer_name="John Doe",
            phone="+919876543210",
            email="cust1@test.com",
            total_amount=200.0,
            preferred_date="2026-08-18"
        )

        url = "/api/auth/delete-account/"
        res = self.client.post(url, {
            "email": self.customer_user_1.email,
            "password": "custpassword123"
        }, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify CustomerIdentity is anonymized, not deleted
        self.identity_1.refresh_from_db()
        self.assertEqual(self.identity_1.phone_normalized, "")
        self.assertEqual(self.identity_1.email_normalized, "")

        # Verify booking customer details are cleared but booking remains
        booking = ServiceRequest.objects.get(request_id="SR-DEL-TEST")
        self.assertEqual(booking.customer_name, "Anonymized Customer")
        self.assertEqual(booking.phone, "")

        # Verify CustomerLoginEvent logs are anonymized
        login_log = CustomerLoginEvent.objects.filter(customer=self.customer_user_1).first()
        self.assertIsNone(login_log.ip_address)
        self.assertEqual(login_log.user_agent, "")

        # Verify User model is deactivated and names cleared
        self.customer_user_1.refresh_from_db()
        self.assertFalse(self.customer_user_1.is_active)
        self.assertEqual(self.customer_user_1.first_name, "Anonymized")

    def test_customer_user_sync_on_create_and_update(self):
        """
        Tests that saving a User with role='customer' inserts/updates CustomerUser.
        """
        from customer_analytics.models import CustomerUser
        
        # 1. Test create customer
        new_cust = User.objects.create_user(
            username="new_cust_test",
            email="newcust@test.com",
            password="password123",
            role="customer",
            first_name="Jane",
            last_name="Doe",
            company=self.company
        )
        
        cust_user_row = CustomerUser.objects.filter(user=new_cust).first()
        self.assertIsNotNone(cust_user_row)
        self.assertEqual(cust_user_row.name, "Jane Doe")
        self.assertEqual(cust_user_row.email, "newcust@test.com")
        self.assertEqual(cust_user_row.company, self.company)
        
        # 2. Test update details
        new_cust.first_name = "Janet"
        new_cust.save()
        
        cust_user_row.refresh_from_db()
        self.assertEqual(cust_user_row.name, "Janet Doe")
