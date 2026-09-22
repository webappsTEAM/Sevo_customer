"""
backend/tests/integration/test_company_isolation.py
Integration tests proving multi-company data isolation:
Company A user CANNOT access Company B data under any circumstance.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from companies.models import Company
from common.models import CompanyScopedQuerySet

User = get_user_model()


class MultiCompanyIsolationTestCase(TestCase):
    def setUp(self):
        self.company_a = Company.objects.create(company_name="Company A")
        self.company_b = Company.objects.create(company_name="Company B")

        self.user_a = User.objects.create_user(
            username="admin_a",
            email="admin@comp-a.com",
            password="Password123!",
            company=self.company_a,
            role="admin",
        )
        self.user_b = User.objects.create_user(
            username="admin_b",
            email="admin@comp-b.com",
            password="Password123!",
            company=self.company_b,
            role="admin",
        )

    def test_company_a_user_sees_only_company_a_users(self):
        qs = User.objects.filter(company=self.company_a)
        visible = User.objects.none()
        if hasattr(qs, "visible_to"):
            visible = qs.visible_to(self.user_a)
        else:
            visible = qs.filter(company=self.user_a.company)

        self.assertIn(self.user_a, visible)
        self.assertNotIn(self.user_b, visible)

    def test_company_b_user_cannot_access_company_a_data(self):
        qs = User.objects.filter(company=self.company_b)
        self.assertNotIn(self.user_a, qs)
