"""
service_requests/views_estimation.py

Customer REST API endpoints for AC Inspection / Estimation lifecycle:
- GET  /api/booking/{id}/
- GET  /api/booking/{id}/estimation/
- GET  /api/booking/{id}/inspection/
- GET  /api/booking/{id}/quotation/
- POST /api/booking/{id}/quotation/approve/
- POST /api/booking/{id}/quotation/reject/
"""
import logging
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from service_requests.models import ServiceRequest, Estimation, EstimationQuotation, Inspection
from service_requests.serializers import (
    ServiceRequestDetailSerializer,
    EstimationSerializer,
    InspectionSerializer,
    EstimationQuotationSerializer,
)
from service_requests.services.quotation_service import QuotationService
from service_requests.services.estimation_service import EstimationStateConflictError

logger = logging.getLogger("service_requests.estimation.api")


def _get_booking(request, identifier):
    """
    Resolves ServiceRequest by numeric ID or string request_id (e.g. HV-20260903-XXXX).
    Validates ownership or tracking token access.
    """
    try:
        if str(identifier).isdigit():
            sr = ServiceRequest.objects.select_related(
                "customer", "estimation", "estimation__fee"
            ).get(pk=int(identifier))
        else:
            sr = ServiceRequest.objects.select_related(
                "customer", "estimation", "estimation__fee"
            ).get(request_id=identifier)
    except ServiceRequest.DoesNotExist:
        return None, Response(
            {"success": False, "message": "Booking not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Authorization check
    if request.user and request.user.is_authenticated:
        if getattr(request.user, "is_staff", False) or getattr(request.user, "role", "") in {"admin", "superadmin"}:
            return sr, None
        if sr.customer_id and sr.customer_id == request.user.id:
            return sr, None
        # Phone / Email match
        user_email = (getattr(request.user, "email", "") or "").strip().lower()
        user_phone = (getattr(request.user, "phone", "") or "").strip()[-10:]
        if user_email and sr.email and user_email == sr.email.strip().lower():
            return sr, None
        if user_phone and sr.phone and user_phone == sr.phone.strip()[-10:]:
            return sr, None

    # Check tracking token access for guest / unauthenticated verification
    token = (
        request.query_params.get("token")
        or request.headers.get("X-Tracking-Token")
        or (request.data.get("token") if hasattr(request, "data") else None)
    )
    if token and sr.tracking_token and str(sr.tracking_token).lower() == str(token).strip().lower():
        return sr, None

    if not request.user or not request.user.is_authenticated:
        return None, Response(
            {"success": False, "message": "Authentication or valid tracking token required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return None, Response(
        {"success": False, "message": "You are not authorized to view this booking."},
        status=status.HTTP_403_FORBIDDEN,
    )


class CustomerBookingDetailView(APIView):
    """
    GET /api/booking/{id}/
    Returns authoritative ServiceRequest details including job_type and nested estimation.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        serializer = ServiceRequestDetailSerializer(sr, context={"request": request})
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class CustomerEstimationDetailView(APIView):
    """
    GET /api/booking/{id}/estimation/
    Returns Estimation detail record, authoritative fee, and current status.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        if not hasattr(sr, "estimation"):
            return Response(
                {"success": False, "message": "No estimation record found for this booking."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EstimationSerializer(sr.estimation, context={"request": request})
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class CustomerInspectionDetailView(APIView):
    """
    GET /api/booking/{id}/inspection/
    Returns CustomerInspection snapshot and any technician inspection findings.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        from service_requests.services.customer_inspection_service import CustomerInspectionService
        snapshot_data = CustomerInspectionService.get_booking_inspection_snapshot(sr)

        findings_data = None
        if hasattr(sr, "estimation") and hasattr(sr.estimation, "inspection"):
            findings_data = InspectionSerializer(sr.estimation.inspection, context={"request": request}).data

        if not snapshot_data and not findings_data:
            return Response(
                {"success": False, "message": "No inspection record found for this booking."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = dict(snapshot_data) if snapshot_data else {}
        if findings_data:
            data["technician_findings"] = findings_data

        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class CustomerBookingRateCardSnapshotView(APIView):
    """
    GET /api/booking/{id}/inspection-rate-card/
    Returns the immutable booking-specific CustomerInspection and CustomerInspectionRateSnapshot.
    Guarantees that old bookings display their historical rates, not future updated rates.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        from service_requests.services.customer_inspection_service import CustomerInspectionService
        snapshot_data = CustomerInspectionService.get_booking_inspection_snapshot(sr)

        if not snapshot_data:
            return Response(
                {"success": False, "message": "No inspection rate card snapshot found for this booking."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": snapshot_data}, status=status.HTTP_200_OK)



class CustomerQuotationDetailView(APIView):
    """
    GET /api/booking/{id}/quotation/
    Returns active/latest quotation or quotation history for the booking.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        if not hasattr(sr, "estimation"):
            return Response(
                {"success": False, "message": "No estimation found for this booking."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Retrieve latest or specific quotation
        quotations = sr.estimation.quotations.prefetch_related("items").order_by("-version")
        quote_id = request.query_params.get("quotation_id")
        if quote_id and quote_id.isdigit():
            quote = quotations.filter(pk=int(quote_id)).first()
        else:
            quote = quotations.first()

        if not quote:
            return Response(
                {"success": False, "message": "No quotation has been issued yet for this estimation."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EstimationQuotationSerializer(quote, context={"request": request})
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class CustomerQuotationApproveView(APIView):
    """
    POST /api/booking/{id}/quotation/approve/
    Customer approves quotation. Converts job_type to CHANGE_REQUEST on the SAME booking.
    Protected against duplicate/conflicting transitions (returns HTTP 409 Conflict).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        quotation_id = request.data.get("quotation_id")
        if quotation_id and not str(quotation_id).isdigit():
            return Response(
                {"success": False, "message": "Invalid quotation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quotation_id_int = int(quotation_id) if quotation_id else None

        try:
            updated_sr = QuotationService.approve_quotation(
                service_request_id=sr.id,
                quotation_id=quotation_id_int,
                customer=request.user if request.user.is_authenticated else sr.customer,
            )
        except EstimationStateConflictError as conflict_err:
            return Response(
                {"success": False, "message": str(conflict_err)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            if hasattr(e, "detail"):
                return Response({"success": False, "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            logger.error(f"[QuotationApprove] Error: {e}", exc_info=True)
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ServiceRequestDetailSerializer(updated_sr, context={"request": request})
        return Response(
            {
                "success": True,
                "message": "Quotation approved successfully. Work request confirmed.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class CustomerQuotationRejectView(APIView):
    """
    POST /api/booking/{id}/quotation/reject/
    Customer rejects quotation. Closes estimation, leaves job_type as ESTIMATION.
    Protected against duplicate/conflicting transitions (returns HTTP 409 Conflict).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None, identifier=None):
        target = pk or identifier
        sr, error_resp = _get_booking(request, target)
        if error_resp:
            return error_resp

        quotation_id = request.data.get("quotation_id")
        if quotation_id and not str(quotation_id).isdigit():
            return Response(
                {"success": False, "message": "Invalid quotation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quotation_id_int = int(quotation_id) if quotation_id else None

        reason_code = str(request.data.get("reason_code") or request.data.get("reason") or "OTHER").strip()
        reason_note = str(request.data.get("reason_note") or request.data.get("notes") or "").strip()

        try:
            updated_sr = QuotationService.reject_quotation(
                service_request_id=sr.id,
                quotation_id=quotation_id_int,
                customer=request.user if request.user.is_authenticated else sr.customer,
                reason_code=reason_code,
                reason_note=reason_note,
            )
        except EstimationStateConflictError as conflict_err:
            return Response(
                {"success": False, "message": str(conflict_err)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            if hasattr(e, "detail"):
                return Response({"success": False, "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            logger.error(f"[QuotationReject] Error: {e}", exc_info=True)
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ServiceRequestDetailSerializer(updated_sr, context={"request": request})
        return Response(
            {
                "success": True,
                "message": "Quotation rejected. Estimation request closed.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
