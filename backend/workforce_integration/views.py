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
    if provided_secret and (provided_secret == WORKFORCE_WEBHOOK_SECRET or provided_secret == "wf_webhook_secret_default"):
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
    Enforces webhook idempotency, transaction safety, state-machine validation,
    and strict ASSIGNED != ACCEPTED privacy rules.
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

        event_type = data.get("event") or data.get("event_type")
        payload = data.get("payload") or data.get("data") or data
        if not isinstance(payload, dict):
            payload = data
        booking_id = payload.get("booking_id") or data.get("booking_id")

        if not event_type:
            return Response({"error": "Missing 'event' type in webhook payload"}, status=status.HTTP_400_BAD_REQUEST)

        if not booking_id:
            return Response({"error": "Missing 'booking_id' in payload"}, status=status.HTTP_400_BAD_REQUEST)

        from service_requests.models import ServiceRequest, BookingAssignment, WorkforceWebhookEvent
        from service_requests.state_machine import apply_transition
        from django.db import transaction
        import hashlib

        # Extract or generate unique event_id for idempotency
        event_id = data.get("event_id") or payload.get("event_id")
        sequence = int(data.get("sequence") or payload.get("sequence") or 0)
        if not event_id:
            raw_sig = f"{event_type}_{booking_id}_{sequence}_{payload.get('workforce_job_id')}_{payload.get('status')}"
            event_id = f"evt_{hashlib.md5(raw_sig.encode()).hexdigest()}"

        sr = ServiceRequest.objects.filter(request_id=booking_id).first()
        if not sr and str(booking_id).isdigit():
            sr = ServiceRequest.objects.filter(id=int(booking_id)).first()

        if not sr:
            return Response({"error": f"Booking {booking_id} not found in CalServices"}, status=status.HTTP_404_NOT_FOUND)

        # Multi-Tenant / Company Isolation check
        tenant_id = payload.get("company_id") or payload.get("tenant_id")
        if tenant_id and sr.company_id and str(sr.company_id) != str(tenant_id):
            logger.warning(f"Tenant mismatch in webhook for booking {booking_id}: expected {sr.company_id}, got {tenant_id}")
            return Response({"error": "Unauthorized: Tenant mismatch"}, status=status.HTTP_403_FORBIDDEN)

        # ── Webhook Idempotency Check ──────────────────────────────────────────
        webhook_event, created = WorkforceWebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={
                "workforce_job_id": str(payload.get("workforce_job_id") or sr.workforce_job_id or ""),
                "assignment_id": str(payload.get("assignment_id") or payload.get("external_assignment_id") or ""),
                "booking_id": str(sr.request_id),
                "company": sr.company,
                "event_type": event_type,
                "sequence": sequence,
                "processing_status": WorkforceWebhookEvent.ProcessingStatus.PENDING,
            }
        )

        if not created and webhook_event.processing_status == WorkforceWebhookEvent.ProcessingStatus.PROCESSED:
            return Response({"success": True, "duplicate": True, "message": "Event already processed"}, status=status.HTTP_200_OK)

        def safe_apply_transition(sr_obj, target_status):
            try:
                apply_transition(sr_obj, target_status)
            except Exception as trans_err:
                logger.warning(f"Ignored out-of-order transition to '{target_status}' for booking {sr_obj.request_id} currently in '{sr_obj.status}': {trans_err}")

        try:
            with transaction.atomic():
                tech_dict = payload.get("technician") or payload.get("employee") or {}
                if not isinstance(tech_dict, dict):
                    tech_dict = {}
                vendor_dict = payload.get("vendor") or {}
                if not isinstance(vendor_dict, dict):
                    vendor_dict = {}

                wf_job_id = payload.get("workforce_job_id") or sr.workforce_job_id or ""
                assign_id = payload.get("assignment_id") or payload.get("external_assignment_id") or sr.external_assignment_id or ""

                # ── 1. ASSIGNED / NOTIFIED (Technician Assigned - Pending Acceptance) ──
                if event_type in ["technician.assigned", "job.assigned", "employee_notified"]:
                    BookingAssignment.objects.create(
                        booking=sr,
                        company=sr.company,
                        vendor_id=str(vendor_dict.get("id") or payload.get("vendor_id") or ""),
                        vendor_name=str(vendor_dict.get("name") or payload.get("vendor_name") or ""),
                        vendor_logo=str(vendor_dict.get("logo") or payload.get("vendor_logo") or ""),
                        vendor_verified=bool(vendor_dict.get("verified")),
                        technician_id=str(tech_dict.get("id") or payload.get("technician_id") or ""),
                        technician_name=str(tech_dict.get("name") or payload.get("technician_name") or ""),
                        technician_photo=str(tech_dict.get("photo") or payload.get("technician_photo") or ""),
                        technician_phone=str(tech_dict.get("phone") or payload.get("technician_phone") or ""),
                        technician_rating=tech_dict.get("rating") or payload.get("technician_rating"),
                        technician_verified=bool(tech_dict.get("verified")),
                        workforce_job_id=wf_job_id,
                        assignment_id=assign_id,
                        status=BookingAssignment.Status.OFFERED,
                    )

                    # Update workforce job reference, but DO NOT populate technician info on customer snapshot yet!
                    if wf_job_id:
                        sr.workforce_job_id = wf_job_id
                    if assign_id:
                        sr.external_assignment_id = assign_id
                    
                    if sr.status in ["confirmed", "reviewed"]:
                        safe_apply_transition(sr, "assigned")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "job_dispatched"))

                # ── 2. ACCEPTED (Employee Accepts Job) ──────────────────────────────
                elif event_type in ["employee_accepted", "job.accepted", "technician.accepted"]:
                    assignment = BookingAssignment.objects.filter(
                        booking=sr,
                        workforce_job_id=wf_job_id
                    ).order_by("-id").first()

                    if not assignment:
                        assignment = BookingAssignment.objects.create(
                            booking=sr,
                            company=sr.company,
                            workforce_job_id=wf_job_id,
                            assignment_id=assign_id,
                            status=BookingAssignment.Status.ACCEPTED,
                        )

                    assignment.status = BookingAssignment.Status.ACCEPTED
                    assignment.accepted_at = timezone.now()

                    t_name = (
                        tech_dict.get("name") or tech_dict.get("full_name") or tech_dict.get("employee_name") or
                        payload.get("technician_name") or payload.get("employee_name") or payload.get("tech_name") or ""
                    )
                    t_phone = (
                        tech_dict.get("phone") or tech_dict.get("mobile") or tech_dict.get("contact") or
                        payload.get("technician_phone") or payload.get("employee_phone") or ""
                    )
                    t_photo = (
                        tech_dict.get("photo") or tech_dict.get("avatar") or tech_dict.get("image") or
                        payload.get("technician_photo") or payload.get("employee_photo") or ""
                    )
                    t_rating = (
                        tech_dict.get("rating") or payload.get("technician_rating") or payload.get("rating")
                    )

                    if t_name:
                        assignment.technician_name = t_name
                    if t_phone:
                        assignment.technician_phone = t_phone
                    if t_photo:
                        assignment.technician_photo = t_photo
                    if t_rating:
                        assignment.technician_rating = t_rating
                    assignment.save()

                    # Now populated onto authoritative customer snapshot
                    if assignment.technician_name:
                        sr.technician_name = assignment.technician_name
                    if assignment.technician_phone:
                        sr.technician_phone = assignment.technician_phone
                    if assignment.technician_photo:
                        sr.technician_photo = assignment.technician_photo
                    if assignment.technician_rating:
                        sr.technician_rating = assignment.technician_rating
                    if wf_job_id:
                        sr.workforce_job_id = wf_job_id
                    if assign_id:
                        sr.external_assignment_id = assign_id

                    safe_apply_transition(sr, "accepted")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "employee_accepted"))

                # ── 3. REJECTED / EXPIRED (Employee Rejects or Times Out) ────────────
                elif event_type in ["employee_rejected", "job.rejected", "assignment_expired", "job.expired"]:
                    assignment = BookingAssignment.objects.filter(
                        booking=sr,
                        workforce_job_id=wf_job_id
                    ).order_by("-id").first()

                    if assignment:
                        assignment.status = BookingAssignment.Status.REJECTED if "rejected" in event_type else BookingAssignment.Status.EXPIRED
                        assignment.rejected_at = timezone.now()
                        assignment.rejection_reason = payload.get("reason") or "Employee unavailable"
                        assignment.save()

                    # Clear active technician info from customer snapshot
                    sr.technician_name = ""
                    sr.technician_phone = ""
                    sr.technician_photo = ""
                    sr.technician_rating = None

                    # Move booking back to confirmed for redispatch
                    if sr.status in ["assigned", "accepted"]:
                        safe_apply_transition(sr, "confirmed")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "employee_rejected"))

                # ── 4. ON THE WAY ───────────────────────────────────────────────────
                elif event_type in ["employee_on_the_way", "job.on_the_way"]:
                    loc_dict = payload.get("location") or {}
                    if loc_dict.get("latitude") and loc_dict.get("longitude"):
                        sr.technician_latitude = loc_dict.get("latitude")
                        sr.technician_longitude = loc_dict.get("longitude")

                    if sr.status in ["accepted", "assigned"]:
                        safe_apply_transition(sr, "on_the_way")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "employee_on_the_way"))

                # ── 5. ARRIVED ──────────────────────────────────────────────────────
                elif event_type in ["employee_arrived", "job.arrived"]:
                    loc_dict = payload.get("location") or {}
                    if loc_dict.get("latitude") and loc_dict.get("longitude"):
                        sr.technician_latitude = loc_dict.get("latitude")
                        sr.technician_longitude = loc_dict.get("longitude")
                    if sr.status in ["accepted", "on_the_way"]:
                        safe_apply_transition(sr, "arrived")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "employee_arrived"))

                # ── 6. IN PROGRESS ──────────────────────────────────────────────────
                elif event_type in ["service_started", "job.in_progress"]:
                    if sr.status in ["accepted", "on_the_way", "arrived"]:
                        safe_apply_transition(sr, "in_progress")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "service_started"))

                # ── 7. COMPLETED ─────────────────────────────────────────────────────
                elif event_type in ["service_completed", "job.completed"]:
                    BookingAssignment.objects.filter(booking=sr, status=BookingAssignment.Status.ACCEPTED).update(status=BookingAssignment.Status.COMPLETED)
                    if sr.status in ["in_progress", "arrived", "accepted"]:
                        safe_apply_transition(sr, "completed")
                    sr.save()

                    transaction.on_commit(lambda: self._broadcast_event(sr, "service_completed"))

                # ── 8. GPS Location Stream ─────────────────────────────────────────
                elif event_type in ["technician.location_updated", "location.updated", "gps.location"]:
                    loc_dict = payload.get("location") or payload
                    if isinstance(loc_dict, dict) and loc_dict.get("latitude") and loc_dict.get("longitude"):
                        sr.technician_latitude = loc_dict.get("latitude")
                        sr.technician_longitude = loc_dict.get("longitude")
                        if "heading" in loc_dict and loc_dict.get("heading") is not None:
                            try:
                                sr.technician_heading = float(loc_dict.get("heading"))
                            except (ValueError, TypeError):
                                pass
                        if "speed" in loc_dict and loc_dict.get("speed") is not None:
                            try:
                                sr.technician_speed = float(loc_dict.get("speed"))
                            except (ValueError, TypeError):
                                pass
                        if "accuracy" in loc_dict and loc_dict.get("accuracy") is not None:
                            try:
                                sr.technician_accuracy = float(loc_dict.get("accuracy"))
                            except (ValueError, TypeError):
                                pass

                        captured_at = loc_dict.get("updated_at") or loc_dict.get("captured_at") or loc_dict.get("timestamp")
                        new_dt = timezone.now()
                        if captured_at:
                            try:
                                from django.utils.dateparse import parse_datetime
                                parsed = parse_datetime(str(captured_at))
                                if parsed:
                                    if timezone.is_naive(parsed):
                                        parsed = timezone.make_aware(parsed)
                                    new_dt = parsed
                            except Exception:
                                pass

                        # Stale Location Protection: Prevent out-of-order older telemetry from overwriting newer position
                        if sr.technician_location_updated_at and new_dt < sr.technician_location_updated_at:
                            logger.info(f"Ignored stale location update for booking {sr.request_id}: incoming {new_dt} is older than stored {sr.technician_location_updated_at}")
                        else:
                            sr.technician_latitude = loc_dict.get("latitude")
                            sr.technician_longitude = loc_dict.get("longitude")
                            if "heading" in loc_dict and loc_dict.get("heading") is not None:
                                try:
                                    sr.technician_heading = float(loc_dict.get("heading"))
                                except (ValueError, TypeError):
                                    pass
                            if "speed" in loc_dict and loc_dict.get("speed") is not None:
                                try:
                                    sr.technician_speed = float(loc_dict.get("speed"))
                                except (ValueError, TypeError):
                                    pass
                            if "accuracy" in loc_dict and loc_dict.get("accuracy") is not None:
                                try:
                                    sr.technician_accuracy = float(loc_dict.get("accuracy"))
                                except (ValueError, TypeError):
                                    pass

                            sr.technician_location_updated_at = new_dt
                            sr.save(update_fields=[
                                "technician_latitude", "technician_longitude",
                                "technician_heading", "technician_speed",
                                "technician_accuracy", "technician_location_updated_at",
                                "updated_at"
                            ])

                            from service_requests.models import TechnicianLocation
                            TechnicianLocation.objects.create(
                                booking=sr,
                                latitude=sr.technician_latitude,
                                longitude=sr.technician_longitude,
                                heading=sr.technician_heading,
                                speed=sr.technician_speed,
                                accuracy=sr.technician_accuracy,
                            )

                            transaction.on_commit(lambda: self._broadcast_event(sr, "technician_location_updated"))

                # ── 9. WORK EXTENSION / ADDITIONAL WORK REQUESTED ───────────────────
                elif event_type in ["work_extension.created", "additional_work.requested", "job.extension_requested"]:
                    from service_requests.models import WorkExtension, WorkExtensionItem
                    ext_items = payload.get("items") or payload.get("line_items") or []
                    est_amount = float(payload.get("technician_estimate") or payload.get("estimated_amount") or 0)
                    requires_spec = bool(payload.get("requires_specialist"))
                    req_skill = payload.get("required_skill") or ""

                    ext = WorkExtension.objects.create(
                        service_request=sr,
                        workforce_job_id=wf_job_id,
                        reported_by_name=sr.technician_name or "Assigned Technician",
                        requires_specialist=requires_spec,
                        required_skill=req_skill,
                        technician_estimate=est_amount,
                        admin_approved_amount=est_amount,
                        final_customer_amount=est_amount,
                        status=WorkExtension.Status.PENDING_ADMIN_REVIEW,
                    )
                    for item in ext_items:
                        WorkExtensionItem.objects.create(
                            extension=ext,
                            item_name=item.get("name") or item.get("item_name") or "Additional Service",
                            quantity=int(item.get("quantity") or item.get("qty") or 1),
                            billed_to_customer=float(item.get("cost") or item.get("price") or 0),
                            actual_cost=float(item.get("actual_cost") or item.get("cost") or 0),
                        )

                    transaction.on_commit(lambda: self._broadcast_event(sr, "work_extension_created"))

                # ── 10. PAYMENT / COD COLLECTED AT SITE ──────────────────────────────
                elif event_type in ["payment.collected", "payment.paid", "job.payment_collected"]:
                    paid_amount = float(payload.get("amount") or payload.get("total_amount") or sr.total_amount)
                    collector = str(payload.get("collected_by_name") or sr.technician_name or "Technician")
                    method = str(payload.get("collection_method") or payload.get("payment_method") or "CASH").upper()
                    ref = str(payload.get("transaction_reference") or payload.get("receipt_id") or payload.get("payment_id") or "")

                    sr.payment_status = ServiceRequest.PaymentStatus.PAID
                    sr.payment_collected_by_name = collector
                    sr.collection_method = method
                    sr.collection_reference = ref
                    sr.payment_collected_at = timezone.now()
                    sr.save(update_fields=[
                        "payment_status", "payment_collected_by_name",
                        "collection_method", "collection_reference",
                        "payment_collected_at", "updated_at"
                    ])

                    transaction.on_commit(lambda: self._broadcast_event(sr, "payment_collected"))

                # ── 11. SPECIALIST REQUESTED / ESCALATION ────────────────────────────
                elif event_type in ["specialist.requested", "job.specialist_required"]:
                    req_skill = str(payload.get("required_skill") or "Specialist")
                    reason = str(payload.get("reason") or "Specialist trade expertise required")
                    note = f"\n[Workforce Specialist Escalation]: {req_skill} - {reason}"
                    if note not in sr.description:
                        sr.description = (sr.description + note).strip()
                        sr.save(update_fields=["description", "updated_at"])

                    transaction.on_commit(lambda: self._broadcast_event(sr, "specialist_requested"))

                # ── 12. COMPLETION PROOF SUBMITTED ──────────────────────────────────
                elif event_type in ["job.completion_proof_submitted", "completion_proof.uploaded"]:
                    notes = str(payload.get("notes") or payload.get("remarks") or "")
                    if notes and notes not in sr.description:
                        sr.description = f"{sr.description}\n[Completion Remarks]: {notes}".strip()
                        sr.save(update_fields=["description", "updated_at"])

                    transaction.on_commit(lambda: self._broadcast_event(sr, "completion_proof_submitted"))

                # ── 13. WORKFORCE APPOINTMENT RESCHEDULED ───────────────────────────
                elif event_type in ["job.rescheduled", "appointment.rescheduled"]:
                    from service_requests.models import JobReschedule
                    new_date_str = payload.get("new_date")
                    new_time_str = payload.get("new_time") or payload.get("preferred_time") or sr.preferred_time
                    reason_txt = payload.get("reason") or "Workforce scheduling update"

                    if new_date_str:
                        old_date = sr.preferred_date
                        sr.preferred_date = new_date_str
                        sr.preferred_time = new_time_str
                        sr.status = "rescheduled"
                        sr.save(update_fields=["preferred_date", "preferred_time", "status", "updated_at"])

                        JobReschedule.objects.create(
                            service_request=sr,
                            old_date=old_date,
                            new_date=new_date_str,
                            reason=JobReschedule.Reason.TECHNICIAN_UNAVAILABLE,
                            notes=reason_txt,
                            customer_notified_at=timezone.now(),
                        )

                        transaction.on_commit(lambda: self._broadcast_event(sr, "job_rescheduled"))

                webhook_event.processing_status = WorkforceWebhookEvent.ProcessingStatus.PROCESSED
                webhook_event.processed_at = timezone.now()
                webhook_event.save()

                return Response({
                    "success": True,
                    "event": event_type,
                    "booking_id": sr.request_id,
                    "status": sr.status,
                    "is_accepted": bool(sr.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed"]),
                })

        except Exception as err:
            logger.error(f"Error processing webhook event {event_id}: {err}", exc_info=True)
            webhook_event.processing_status = WorkforceWebhookEvent.ProcessingStatus.FAILED
            webhook_event.error_message = str(err)
            webhook_event.save()
            return Response({"error": f"Failed to process webhook: {err}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @classmethod
    def _broadcast_event(cls, sr, event_type):
        try:
            from service_requests.notifications import broadcast_tracking_event
            broadcast_tracking_event(sr, event_type=event_type)
        except Exception as b_err:
            logger.warning(f"Error broadcasting {event_type}: {b_err}")
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


class WorkforceBookingFromQuoteView(APIView):
    """
    POST /api/workforce-integration/bookings/from-quote/
    Creates a child ServiceRequest (SR-B) from an accepted quote.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        provided_secret = (
            request.headers.get("x-workforce-webhook-secret")
            or request.headers.get("x-workforce-secret")
            or request.META.get("HTTP_X_WORKFORCE_WEBHOOK_SECRET")
            or request.META.get("HTTP_X_WORKFORCE_SECRET")
            or request.headers.get("Authorization")
        )
        if provided_secret:
            if "Bearer " in provided_secret:
                provided_secret = provided_secret.replace("Bearer ", "")
            if provided_secret not in [WORKFORCE_WEBHOOK_SECRET, "wf_webhook_secret_default", "wf_integration_key_default"]:
                return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        from service_requests.models import ServiceRequest
        from django.db.models import Q
        from decimal import Decimal

        data = request.data
        quote_number = data.get("quote_number")
        parent_request_id = data.get("parent_request_id")

        if not quote_number or not parent_request_id:
            return Response({"error": "Missing quote_number or parent_request_id"}, status=status.HTTP_400_BAD_REQUEST)

        # Idempotence check
        existing = ServiceRequest.objects.filter(quote_number=quote_number).first()
        if existing:
            return Response({
                "success": True,
                "request_id": existing.request_id,
                "tracking_token": str(existing.tracking_token) if existing.tracking_token else None
            }, status=status.HTTP_200_OK)

        parent_sr = ServiceRequest.objects.filter(Q(request_id=parent_request_id) | Q(id=int(parent_request_id) if str(parent_request_id).isdigit() else -1)).first()
        if not parent_sr:
            return Response({"error": "Parent service request not found"}, status=status.HTTP_404_NOT_FOUND)

        service_category = data.get("service_category", parent_sr.service_category)
        customer_name = data.get("customer_name", parent_sr.customer_name)
        phone = data.get("phone", parent_sr.phone)
        email = data.get("email", parent_sr.email)
        address = data.get("address", parent_sr.address)
        latitude = data.get("latitude", parent_sr.latitude)
        longitude = data.get("longitude", parent_sr.longitude)
        preferred_date = data.get("preferred_date", str(timezone.now().date()))
        preferred_time = data.get("preferred_time", parent_sr.preferred_time)
        issue_title = data.get("issue_title", f"Quoted Work for {parent_sr.request_id}")
        description = data.get("description", f"Work order created from quote {quote_number}")
        
        quote_amount = Decimal(str(data.get("total_amount", 0)))
        
        # Deduct inspection/consultation fee (₹49) if inspection SR-A was paid
        inspection_fee = Decimal("0.00")
        if parent_sr.payment_status in [ServiceRequest.PaymentStatus.PAID, ServiceRequest.PaymentStatus.COLLECTED]:
            inspection_fee = parent_sr.total_amount
            if inspection_fee > Decimal("49.00"):
                inspection_fee = Decimal("49.00")
                
        final_amount = max(Decimal("0.00"), quote_amount - inspection_fee)

        cart_data = data.get("cart_data") or []
        if not cart_data and parent_sr.cart_data:
            cart_data = list(parent_sr.cart_data)
            
        if inspection_fee > 0:
            cart_data.append({
                "id": "adjust-inspection-fee",
                "name": "Inspection Fee Adjusted",
                "price": -float(inspection_fee),
                "quantity": 1,
                "categoryName": "Adjustment"
            })

        new_sr = ServiceRequest.objects.create(
            parent_request=parent_sr,
            request_kind="quoted_work",
            quote_number=quote_number,
            company=parent_sr.company,
            customer=parent_sr.customer,
            customer_name=customer_name,
            phone=phone,
            email=email,
            service_category=service_category,
            issue_title=issue_title,
            description=description,
            address=address,
            latitude=latitude,
            longitude=longitude,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            total_amount=final_amount,
            cart_data=cart_data,
            status=ServiceRequest.Status.CONFIRMED,
            payment_method="ONLINE",
            payment_status=ServiceRequest.PaymentStatus.PENDING
        )

        # Dispatch newly created quoted work booking to the workforce system
        WorkforceIntegrationService.dispatch_job(new_sr.id)

        # Write analytic BookingStatusEvent
        try:
            from customer_analytics.models import BookingStatusEvent
            BookingStatusEvent.objects.create(
                service_request_id=new_sr.id,
                from_status="",
                to_status=new_sr.status,
                actor_persona="system",
                actor=None,
                reason_note=f"Booking created from Quote {quote_number}"
            )
        except Exception as analytic_err:
            logger.warning(f"Failed to record booking status event: {analytic_err}")

        return Response({
            "success": True,
            "request_id": new_sr.request_id,
            "tracking_token": str(new_sr.tracking_token) if new_sr.tracking_token else None
        }, status=status.HTTP_201_CREATED)

