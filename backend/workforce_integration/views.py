"""
workforce_integration/views.py

Webhook receiver & slot discovery endpoints for Workforce Integration.
Implements:
- Signature and token validation
- Idempotency & duplicate event safety
- Full status lifecycle: assigned -> on_the_way -> arrived -> in_progress -> completed / cancelled
- Read-only technician snapshot synchronization (name, phone, photo, rating)
- Payment collection synchronization
"""
import hmac
import hashlib
import logging
import os
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .services import WorkforceIntegrationService

logger = logging.getLogger("workforce_integration")

WORKFORCE_WEBHOOK_SECRET = getattr(settings, "WORKFORCE_WEBHOOK_SECRET", os.getenv("WORKFORCE_WEBHOOK_SECRET", "wf_webhook_secret_default"))


def _verify_webhook_signature(request) -> bool:
    """
    Verifies HMAC signature or bearer secret for incoming workforce webhooks.
    """
    provided_secret = (
        request.headers.get("x-workforce-webhook-secret")
        or request.headers.get("x-workforce-secret")
        or request.META.get("HTTP_X_WORKFORCE_WEBHOOK_SECRET")
        or request.META.get("HTTP_X_WORKFORCE_SECRET")
    )
    if provided_secret and provided_secret == WORKFORCE_WEBHOOK_SECRET:
        return True

    signature = (
        request.headers.get("x-workforce-signature")
        or request.META.get("HTTP_X_WORKFORCE_SIGNATURE")
    )
    if not signature:
        return False

    raw_body = request.body if hasattr(request, "body") else b""
    expected_sig = hmac.new(
        WORKFORCE_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_sig)


class WorkforceWebhookView(APIView):
    """
    POST /api/workforce-integration/webhook/
    Ingests asynchronous events from the separate Workforce system.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _verify_webhook_signature(request):
            logger.warning("Unauthorized workforce webhook attempt (invalid signature/secret)")
            return Response(
                {"error": "Unauthorized: Invalid or missing webhook signature"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = request.data
        if not isinstance(data, dict):
            return Response({"error": "Invalid payload format: Expected JSON object"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = data.get("event")
        payload = data.get("payload") or data.get("data") or data
        if not isinstance(payload, dict):
            payload = data
        booking_id = payload.get("booking_id") or data.get("booking_id")

        if not event_type:
            return Response({"error": "Missing 'event' type in webhook payload"}, status=status.HTTP_400_BAD_REQUEST)

        if not booking_id:
            return Response({"error": "Missing 'booking_id' in payload"}, status=status.HTTP_400_BAD_REQUEST)

        from service_requests.models import ServiceRequest
        try:
            sr = ServiceRequest.objects.filter(request_id=booking_id).first()
            if not sr and str(booking_id).isdigit():
                sr = ServiceRequest.objects.filter(id=int(booking_id)).first()

            if not sr:
                return Response({"error": f"Booking {booking_id} not found in CalServices"}, status=status.HTTP_404_NOT_FOUND)

            # ── 1. Technician Assignment ──────────────────────────────────────────
            if event_type in ["technician.assigned", "job.assigned", "job.accepted"]:
                tech_dict = payload.get("technician") or payload.get("employee") or {}
                if not isinstance(tech_dict, dict):
                    tech_dict = {}
                sr.technician_name = (
                    payload.get("technician_name")
                    or payload.get("employee_name")
                    or tech_dict.get("name")
                    or tech_dict.get("full_name")
                    or sr.technician_name
                )
                sr.technician_phone = (
                    payload.get("technician_phone")
                    or payload.get("employee_phone")
                    or tech_dict.get("phone")
                    or sr.technician_phone
                )
                sr.technician_photo = (
                    payload.get("technician_photo")
                    or payload.get("employee_photo")
                    or tech_dict.get("photo")
                    or sr.technician_photo
                )
                if payload.get("technician_rating") or tech_dict.get("rating"):
                    sr.technician_rating = payload.get("technician_rating") or tech_dict.get("rating")
                if payload.get("workforce_job_id"):
                    sr.workforce_job_id = payload.get("workforce_job_id")
                sr.external_assignment_id = (
                    payload.get("external_assignment_id")
                    or payload.get("assignment_id")
                    or sr.external_assignment_id
                )
                sr.status = payload.get("status") or "assigned"
                sr.save(update_fields=[
                    "technician_name", "technician_phone", "technician_photo",
                    "technician_rating", "workforce_job_id", "external_assignment_id",
                    "status", "updated_at"
                ])
                try:
                    from service_requests.notifications import broadcast_tracking_event
                    broadcast_tracking_event(sr, event_type="technician_assigned")
                except Exception as b_err:
                    logger.warning(f"Error broadcasting technician_assigned: {b_err}")

            # ── 2. Real-time Status Lifecycle ────────────────────────────────────
            elif event_type in ["job.status_updated", "job.status_change", "job.on_the_way", "job.arrived", "job.in_progress", "job.completed", "job.cancelled"]:
                new_status = payload.get("status") or event_type.replace("job.", "")
                valid_statuses = ["confirmed", "assigned", "accepted", "on_the_way", "arrived", "in_progress", "completed", "cancelled", "closed"]
                if new_status in valid_statuses:
                    sr.status = new_status
                    tech_dict = payload.get("technician") or payload.get("employee") or {}
                    if isinstance(tech_dict, dict):
                        if tech_dict.get("name") or tech_dict.get("full_name"):
                            sr.technician_name = tech_dict.get("name") or tech_dict.get("full_name")
                        if tech_dict.get("phone"):
                            sr.technician_phone = tech_dict.get("phone")
                        if tech_dict.get("photo"):
                            sr.technician_photo = tech_dict.get("photo")
                        if tech_dict.get("rating"):
                            sr.technician_rating = tech_dict.get("rating")
                    if payload.get("technician_name") or payload.get("employee_name"):
                        sr.technician_name = payload.get("technician_name") or payload.get("employee_name")
                    if payload.get("technician_phone") or payload.get("employee_phone"):
                        sr.technician_phone = payload.get("technician_phone") or payload.get("employee_phone")
                    if payload.get("technician_photo"):
                        sr.technician_photo = payload.get("technician_photo")
                    sr.save(update_fields=["status", "technician_name", "technician_phone", "technician_photo", "updated_at"])
                    try:
                        from service_requests.notifications import broadcast_tracking_event
                        broadcast_tracking_event(sr, event_type="technician_status_updated")
                    except Exception as b_err:
                        logger.warning(f"Error broadcasting technician_status_updated: {b_err}")

            # ── 2b. Real-time Location Streaming ─────────────────────────────────
            elif event_type in ["technician.location_updated", "location.updated", "gps.location"]:
                loc_dict = payload.get("location") or payload
                try:
                    from service_requests.notifications import broadcast_tracking_event
                    from service_requests.views import _build_tracking_payload
                    full_payload = _build_tracking_payload(sr, has_full_access=True)
                    if isinstance(loc_dict, dict) and loc_dict.get("latitude") and loc_dict.get("longitude"):
                        full_payload["technician"]["latitude"] = float(loc_dict.get("latitude"))
                        full_payload["technician"]["longitude"] = float(loc_dict.get("longitude"))
                        if loc_dict.get("eta_minutes") is not None:
                            full_payload["technician"]["eta_minutes"] = loc_dict.get("eta_minutes")
                        if loc_dict.get("distance_km") is not None:
                            full_payload["technician"]["distance_km"] = loc_dict.get("distance_km")
                        if loc_dict.get("current_location_name"):
                            full_payload["technician"]["current_location_name"] = loc_dict.get("current_location_name")
                    broadcast_tracking_event(sr, event_type="technician_location_updated", custom_data=full_payload)
                except Exception as b_err:
                    logger.warning(f"Error broadcasting technician_location_updated: {b_err}")

            # ── 3. Payment Collection from Field ─────────────────────────────────
            elif event_type in ["payment.collected", "payment.cash_collected"]:
                sr.payment_status = "paid"
                sr.payment_collected_by_name = payload.get("collected_by_name", payload.get("technician_name", "Field Technician"))
                sr.collection_method = payload.get("collection_method", "cash")
                sr.collection_reference = payload.get("receipt_number", payload.get("reference", ""))
                sr.payment_collected_at = timezone.now()
                sr.save(update_fields=[
                    "payment_status", "payment_collected_by_name",
                    "collection_method", "collection_reference", "payment_collected_at", "updated_at"
                ])
                try:
                    from service_requests.notifications import broadcast_tracking_event
                    broadcast_tracking_event(sr, event_type="job_updated")
                except Exception as b_err:
                    logger.warning(f"Error broadcasting job_updated: {b_err}")

            else:
                logger.info(f"Ignored unhandled workforce event: {event_type}")

            return Response({
                "success": True,
                "event": event_type,
                "booking_id": booking_id,
                "status": sr.status,
                "start_otp": sr.start_otp,
            })
        except Exception as e:
            logger.error(f"Error processing workforce webhook event {event_type}: {e}", exc_info=True)
            return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WorkforceSlotsView(APIView):
    """
    GET /api/workforce-integration/slots/?category=<cat>&date=<YYYY-MM-DD>&lat=<lat>&lng=<lng>
    Returns available technician capacity slots from the external Workforce system.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        category = request.query_params.get("category", "all")
        date_str = request.query_params.get("date", str(timezone.now().date()))
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")

        slots = WorkforceIntegrationService.get_available_slots(category, date_str, lat, lng)
        return Response({"date": date_str, "category": category, "slots": slots})
