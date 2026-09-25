"""
service_requests/views_ac_admin.py

Dedicated Customer Admin views for AC Inspection Bookings module:
- GET  /api/admin/ac-inspections/
- GET  /api/admin/ac-inspections/<int:pk>/
- POST /api/admin/ac-inspections/<int:pk>/estimation/approve/
- POST /api/admin/ac-inspections/<int:pk>/estimation/send-back/
"""
import logging
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from service_requests.models import (
    ServiceRequest,
    Estimation,
    EstimationQuotation,
    CustomerInspection,
)
from service_requests.serializers import (
    AdminACInspectionListSerializer,
    AdminACInspectionDetailSerializer,
)
from service_requests.services.quotation_service import QuotationService
from service_requests.services.estimation_service import EstimationStateConflictError

logger = logging.getLogger("service_requests.ac_admin")


def _get_ac_booking(pk_or_identifier):
    try:
        if str(pk_or_identifier).isdigit():
            return ServiceRequest.objects.select_related(
                "customer", "estimation", "estimation__inspection", "estimation__fee", "customer_inspection"
            ).prefetch_related(
                "estimation__quotations",
                "estimation__quotations__items",
                "estimation__inspection__findings",
                "estimation__inspection__photos",
            ).get(pk=int(pk_or_identifier))
        else:
            return ServiceRequest.objects.select_related(
                "customer", "estimation", "estimation__inspection", "estimation__fee", "customer_inspection"
            ).prefetch_related(
                "estimation__quotations",
                "estimation__quotations__items",
                "estimation__inspection__findings",
                "estimation__inspection__photos",
            ).get(request_id=pk_or_identifier)
    except ServiceRequest.DoesNotExist:
        return None


class AdminACInspectionListView(APIView):
    """
    GET /api/admin/ac-inspections/
    Lists all AC inspection bookings with KPIs and filtering.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = ServiceRequest.objects.filter(
            Q(job_type="ESTIMATION") |
            Q(request_kind="ESTIMATION") |
            Q(customer_inspection__isnull=False) |
            Q(service_category="hvac")
        ).select_related(
            "customer", "estimation", "estimation__inspection", "estimation__fee", "customer_inspection"
        ).prefetch_related(
            "estimation__quotations",
            "estimation__quotations__items",
        ).order_by("-created_at")

        # Search filter
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(request_id__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(technician_name__icontains=search)
            )

        # Assignment status filter
        assignment_filter = request.query_params.get("assignment_status")
        if assignment_filter == "waiting":
            qs = qs.filter(
                status__in=[ServiceRequest.Status.UNASSIGNED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.CONFIRMED],
                technician_name__isnull=True,
            )
        elif assignment_filter == "assigned":
            qs = qs.filter(
                Q(technician_name__isnull=False, technician_name__gt="") |
                Q(external_assignment_id__isnull=False) |
                Q(status__in=[
                    ServiceRequest.Status.ASSIGNED,
                    ServiceRequest.Status.TECHNICIAN_ASSIGNED,
                    ServiceRequest.Status.ACCEPTED,
                    ServiceRequest.Status.ON_THE_WAY,
                    ServiceRequest.Status.TECHNICIAN_ON_THE_WAY,
                    ServiceRequest.Status.ARRIVED,
                    ServiceRequest.Status.TECHNICIAN_ARRIVED,
                    ServiceRequest.Status.IN_PROGRESS,
                    ServiceRequest.Status.INSPECTION_IN_PROGRESS,
                    ServiceRequest.Status.INSPECTION_COMPLETED,
                    ServiceRequest.Status.COMPLETED,
                    ServiceRequest.Status.CLOSED,
                ])
            )

        # Lifecycle stage filter
        stage_filter = request.query_params.get("stage")
        if stage_filter == "pending_review":
            qs = qs.filter(estimation__quotations__status="SUBMITTED_FOR_REVIEW").distinct()
        elif stage_filter == "customer_pending":
            qs = qs.filter(
                Q(status=ServiceRequest.Status.QUOTATION_SENT) |
                Q(estimation__quotations__status__in=["ADMIN_APPROVED", "SENT"])
            ).distinct()
        elif stage_filter == "approved":
            qs = qs.filter(
                Q(estimation__quotations__status__in=["APPROVED", "CUSTOMER_APPROVED"]) |
                Q(status=ServiceRequest.Status.CUSTOMER_APPROVED)
            ).distinct()
        elif stage_filter == "rejected":
            qs = qs.filter(
                Q(estimation__quotations__status__in=["REJECTED", "CUSTOMER_REJECTED"]) |
                Q(status=ServiceRequest.Status.CUSTOMER_REJECTED)
            ).distinct()

        # Compute KPIs over all AC inspection bookings
        all_ac = ServiceRequest.objects.filter(
            Q(job_type="ESTIMATION") |
            Q(request_kind="ESTIMATION") |
            Q(customer_inspection__isnull=False) |
            Q(service_category="hvac")
        )
        total_count = all_ac.count()
        waiting_count = all_ac.filter(
            status__in=[ServiceRequest.Status.UNASSIGNED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.CONFIRMED],
            technician_name__isnull=True,
        ).count()
        in_progress_count = all_ac.filter(
            status__in=[
                ServiceRequest.Status.ASSIGNED,
                ServiceRequest.Status.TECHNICIAN_ASSIGNED,
                ServiceRequest.Status.ACCEPTED,
                ServiceRequest.Status.ON_THE_WAY,
                ServiceRequest.Status.TECHNICIAN_ON_THE_WAY,
                ServiceRequest.Status.ARRIVED,
                ServiceRequest.Status.TECHNICIAN_ARRIVED,
                ServiceRequest.Status.IN_PROGRESS,
                ServiceRequest.Status.INSPECTION_IN_PROGRESS,
            ]
        ).count()
        pending_review_count = all_ac.filter(estimation__quotations__status="SUBMITTED_FOR_REVIEW").distinct().count()
        customer_pending_count = all_ac.filter(
            Q(status=ServiceRequest.Status.QUOTATION_SENT) |
            Q(estimation__quotations__status__in=["ADMIN_APPROVED", "SENT"])
        ).distinct().count()
        approved_count = all_ac.filter(
            Q(estimation__quotations__status__in=["APPROVED", "CUSTOMER_APPROVED"]) |
            Q(status=ServiceRequest.Status.CUSTOMER_APPROVED)
        ).distinct().count()
        closed_count = all_ac.filter(
            status__in=[ServiceRequest.Status.COMPLETED, ServiceRequest.Status.CLOSED, ServiceRequest.Status.CUSTOMER_REJECTED]
        ).count()

        serializer = AdminACInspectionListSerializer(qs, many=True, context={"request": request})
        return Response({
            "success": True,
            "data": serializer.data,
            "kpis": {
                "total": total_count,
                "waiting_assignment": waiting_count,
                "in_progress": in_progress_count,
                "pending_admin_review": pending_review_count,
                "customer_pending": customer_pending_count,
                "customer_approved": approved_count,
                "closed": closed_count,
            }
        }, status=status.HTTP_200_OK)


class AdminACInspectionDetailView(APIView):
    """
    GET /api/admin/ac-inspections/<pk>/
    Full 9-section detail view for Admin.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr = _get_ac_booking(target)
        if not sr:
            return Response({"success": False, "message": "AC Inspection booking not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminACInspectionDetailSerializer(sr, context={"request": request})
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class AdminACInspectionEstimationApproveView(APIView):
    """
    POST /api/admin/ac-inspections/<pk>/estimation/approve/
    Admin reviews and approves estimation.
    Transitions estimation to ADMIN_APPROVED and customer-facing state to CUSTOMER_PENDING.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr = _get_ac_booking(target)
        if not sr:
            return Response({"success": False, "message": "AC Inspection booking not found."}, status=status.HTTP_404_NOT_FOUND)

        quotation_id = request.data.get("quotation_id")
        quotation_id_int = int(quotation_id) if quotation_id and str(quotation_id).isdigit() else None
        admin_note = str(request.data.get("admin_note") or request.data.get("notes") or "").strip()

        try:
            updated_sr = QuotationService.admin_approve_quotation(
                service_request_id=sr.id,
                quotation_id=quotation_id_int,
                admin_user=request.user if request.user.is_authenticated else None,
                admin_note=admin_note,
            )
        except EstimationStateConflictError as conflict_err:
            return Response({"success": False, "message": str(conflict_err)}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            logger.exception("Failed to admin-approve quotation")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Re-fetch full details
        full_sr = _get_ac_booking(updated_sr.id)
        serializer = AdminACInspectionDetailSerializer(full_sr, context={"request": request})
        return Response({
            "success": True,
            "message": "Estimation approved by Admin. Customer can now review the quotation.",
            "data": serializer.data,
        }, status=status.HTTP_200_OK)


class AdminACInspectionEstimationSendBackView(APIView):
    """
    POST /api/admin/ac-inspections/<pk>/estimation/send-back/
    Admin sends estimation back to technician with mandatory comments.
    Transitions estimation to SENT_BACK_TO_TECHNICIAN.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr = _get_ac_booking(target)
        if not sr:
            return Response({"success": False, "message": "AC Inspection booking not found."}, status=status.HTTP_404_NOT_FOUND)

        quotation_id = request.data.get("quotation_id")
        quotation_id_int = int(quotation_id) if quotation_id and str(quotation_id).isdigit() else None
        admin_note = str(request.data.get("admin_note") or request.data.get("notes") or request.data.get("comment") or "").strip()

        if not admin_note:
            return Response({
                "success": False,
                "message": "An explanation or comment is required when sending an estimation back to the technician."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_sr = QuotationService.admin_send_back_quotation(
                service_request_id=sr.id,
                quotation_id=quotation_id_int,
                admin_user=request.user if request.user.is_authenticated else None,
                admin_note=admin_note,
            )
        except EstimationStateConflictError as conflict_err:
            return Response({"success": False, "message": str(conflict_err)}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            logger.exception("Failed to send back quotation to technician")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        full_sr = _get_ac_booking(updated_sr.id)
        serializer = AdminACInspectionDetailSerializer(full_sr, context={"request": request})
        return Response({
            "success": True,
            "message": "Estimation sent back to technician for revision.",
            "data": serializer.data,
        }, status=status.HTTP_200_OK)
