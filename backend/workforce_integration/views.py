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
from datetime import timezone as dt_timezone
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

from .services import WorkforceIntegrationService

logger = logging.getLogger("workforce_integration")

_raw_webhook_secret = getattr(settings, "WORKFORCE_WEBHOOK_SECRET", None) or os.getenv("WORKFORCE_WEBHOOK_SECRET")

if not _raw_webhook_secret:
    # Fixes: this used to silently fall back to the well-known literal
    # "wf_webhook_secret_default" whenever the env var was unset -- and
    # that's confirmed to be exactly what's deployed today (unset in both
    # apps' live .env files), meaning webhook auth is currently a
    # publicly-known skeleton key. The unconditional-acceptance bypass this
    # comment used to describe was already fixed separately (see
    # _verify_webhook_signature below); this fixes the fallback value
    # itself. Mirrors this app's own SECRET_KEY convention: usable locally
    # in DEBUG without extra setup, but fails closed in production so a
    # real secret (matching value on both apps) must be set before going
    # live.
    import sys
    if settings.DEBUG or "test" in sys.argv or getattr(settings, "TESTING", False):
        WORKFORCE_WEBHOOK_SECRET = "dev-insecure-workforce-webhook-secret-local-testing-only"
        logger.warning(
            "WORKFORCE_WEBHOOK_SECRET is not configured -- using a DEBUG-only "
            "placeholder. Set WORKFORCE_WEBHOOK_SECRET (same value on both "
            "apps) in the environment before deploying."
        )
    else:
        raise ValueError(
            "CRITICAL SECURITY ERROR: WORKFORCE_WEBHOOK_SECRET environment "
            "variable is mandatory in production (DEBUG=False) -- it "
            "authenticates cross-app webhook calls with the Vendor app."
        )
else:
    WORKFORCE_WEBHOOK_SECRET = _raw_webhook_secret


def parse_datetime_safe(value):
    """
    Parse a timestamp out of a webhook payload, or return None.

    Returns None rather than raising or defaulting to "now": a fix with an
    unreadable capture time must not be treated as the freshest thing we
    have, because that is exactly how a stale packet would win.
    """
    if not value:
        return None
    from django.utils.dateparse import parse_datetime

    try:
        parsed = parse_datetime(str(value))
    except (TypeError, ValueError):
        return None
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        # datetime.timezone.utc, not django.utils.timezone.utc -- the latter
        # was removed in Django 5.
        parsed = timezone.make_aware(parsed, dt_timezone.utc)
    return parsed


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
    # Fixes webhook-auth bypass: previously this also accepted the literal
    # string "wf_webhook_secret_default" even when WORKFORCE_WEBHOOK_SECRET
    # was configured to something else, so the well-known default always
    # worked as a skeleton key regardless of the real deployed secret.
    if provided_secret and hmac.compare_digest(provided_secret, WORKFORCE_WEBHOOK_SECRET):
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

    AllowAny is correct here -- the vendor app has no user session to send,
    and trust comes from _verify_webhook_signature (shared secret or an
    HMAC-SHA256 over the raw body), not from Django auth. But AllowAny also
    meant this endpoint inherited the blanket anonymous 60/minute rate,
    which is far too low for what it receives: one request per event, with
    GPS alone running at roughly six per minute per active driver. Ten
    drivers saturate it. Because delivery is fire-and-forget with no retry,
    every throttled event is lost for good, silently.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workforce_webhook"

    def post(self, request):
        from service_requests.notifications import notify_technician_assigned, notify_technician_on_the_way, notify_delivery_recipient
        from service_requests.services.logistics_pricing import LOGISTICS_CATEGORIES

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
        if not event_type:
            return Response({"error": "Missing 'event' type in webhook payload"}, status=status.HTTP_400_BAD_REQUEST)

        # ── Intercept Seller Hub Marketplace events before booking_id checks ──
        if str(event_type).startswith("seller_order.") or str(event_type).startswith("marketplace."):
            from orders.marketplace_events import handle_marketplace_webhook_event
            return handle_marketplace_webhook_event(data)

        payload = data.get("payload") or data.get("data") or data
        if not isinstance(payload, dict):
            payload = data
        booking_id = payload.get("booking_id") or data.get("booking_id")

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
                    # Fixes HS-D-06 (partial): customer previously heard nothing
                    # between booking confirmation and job completion.
                    transaction.on_commit(lambda: self._notify(notify_technician_assigned, sr))

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

                # ── 3b. DISPATCH DELAYED (still matching, no state change) ──────────
                # SEVO Booking Dispatch Framework doc, section 4: once a booking
                # has burned through several failed offer cycles on the vendor
                # side without an acceptance, this softens the customer-facing
                # signal instead of leaving it looking identical to a booking
                # that matched instantly. Purely informational -- it deliberately
                # does NOT change sr.status (the booking is still genuinely being
                # matched), so it can't interfere with the real status lifecycle
                # in the branches above and below it. Rides the existing
                # WebSocket tracking channel with an extra payload key rather
                # than adding a new DB field/migration.
                elif event_type in ["booking.dispatch_delayed", "job.dispatch_delayed", "dispatch.delayed"]:
                    delay_message = str(
                        payload.get("message")
                        or "Still matching you with a technician -- this is taking a little longer than usual."
                    )
                    failed_cycles = payload.get("failed_offer_cycles")
                    transaction.on_commit(lambda: self._broadcast_delay_event(sr, delay_message, failed_cycles))

                # ── 3b. ASSIGNED TECHNICIAN IS RUNNING LATE ─────────────────────────
                # Distinct from dispatch_delayed above, which means "still looking
                # for a technician". This one means a technician is already
                # assigned and has reported that they will be late.
                elif event_type in ["technician.delayed", "job.technician_delayed"]:
                    delay_reason = str(payload.get("reason") or "").strip()
                    delay_count = payload.get("delay_count") or 1
                    revised_date = payload.get("rescheduled_date")
                    delay_message = str(
                        payload.get("message")
                        or "Your technician has reported a delay and may arrive later than scheduled."
                    )
                    # Live tracking page updates immediately; the email is sent
                    # once per distinct delay report (deduplicated in
                    # notify_customer_technician_delayed).
                    transaction.on_commit(lambda: self._broadcast_delay_event(sr, delay_message))
                    transaction.on_commit(
                        lambda: self._safe_notify_delay(sr, delay_reason, delay_count, revised_date)
                    )

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
                    # Fixes HS-D-06 (partial)
                    transaction.on_commit(lambda: self._notify(notify_technician_on_the_way, sr))
                    # Fixes GT-D-03: also tell the delivery recipient, if this
                    # is a logistics booking and we have their contact info.
                    if sr.service_category in LOGISTICS_CATEGORIES:
                        transaction.on_commit(lambda: self._notify(notify_delivery_recipient, sr))

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

                    # GT-C-01: reconcile the fare quoted at booking against
                    # what the trip actually was, from server-side facts
                    # only (measured distance if the vendor reported one,
                    # recorded stop progress, customer-approved extra work).
                    # Runs inside the same transaction as the completion so
                    # a booking can never be marked complete with an
                    # unreconciled fare.
                    self._reconcile_fare(sr, payload)

                    transaction.on_commit(lambda: self._broadcast_event(sr, "service_completed"))
                    # HS-A-06: reward a pending referral once the referee's
                    # first booking actually completes. Fire-and-forget, same
                    # pattern as _notify -- a referral-processing failure must
                    # never affect the booking completion itself.
                    transaction.on_commit(lambda: self._process_referral(sr))

                # ── 8. GPS Location Stream ─────────────────────────────────────────
                elif event_type in ["technician.location_updated", "location.updated", "gps.location"]:
                    # Was: write latitude/longitude straight onto the booking
                    # and broadcast. Two things were wrong with that.
                    #
                    # (1) No ordering check. Mobile networks retry and
                    # reorder, so a fix captured at 17:15 routinely arrives
                    # after one captured at 17:20 -- and the later-arriving,
                    # older packet won, moving the customer's map pin
                    # backwards. Because the stale value was persisted it
                    # survived a page reload; the frontend's own out-of-order
                    # guard only protects a live socket session.
                    #
                    # (2) heading, speed and accuracy sent by the vendor were
                    # thrown away, and no TechnicianLocation row was written,
                    # even though that table is the authoritative per-fix
                    # record every reader now uses.
                    #
                    # Both are handled by the same service the technician
                    # app's own ingestion path uses, so the two transports
                    # cannot drift apart again.
                    from service_requests.services.technician_tracking import record_technician_fix

                    loc_dict = payload.get("location") or payload
                    if isinstance(loc_dict, dict) and loc_dict.get("latitude") and loc_dict.get("longitude"):
                        captured_at = parse_datetime_safe(
                            loc_dict.get("updated_at")
                            or loc_dict.get("captured_at")
                            or loc_dict.get("timestamp")
                            or payload.get("captured_at")
                        )
                        outcome, _fix = record_technician_fix(
                            sr,
                            latitude=loc_dict.get("latitude"),
                            longitude=loc_dict.get("longitude"),
                            accuracy=loc_dict.get("accuracy"),
                            heading=loc_dict.get("heading"),
                            speed=loc_dict.get("speed"),
                            captured_at=captured_at,
                            location_name=loc_dict.get("location_name"),
                        )
                        # Only broadcast a position the server actually
                        # accepted. Broadcasting a rejected stale fix would
                        # push the old coordinates to every watching client
                        # and undo the guard on the client side.
                        if outcome == "applied":
                            transaction.on_commit(
                                lambda: self._broadcast_event(sr, "technician_location_updated")
                            )

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

                    # GT-D-01: record an actual proof-of-delivery artefact,
                    # not just free text appended to the description. See
                    # DeliveryProof's docstring for why this is a row per
                    # proof rather than columns on the booking.
                    self._record_delivery_proof(sr, payload)

                    transaction.on_commit(lambda: self._broadcast_event(sr, "completion_proof_submitted"))

                # ── 12b. LOGISTICS LEG ADVANCED (GT-B-03) ───────────────────────────
                # The leg fields shipped with GT-B-03 but nothing ever wrote
                # them, so logistics_leg was permanently "" and everything
                # reading it (leg-aware tracking destination, trip timeline)
                # was inert. This is the write path.
                elif event_type in ["logistics.leg_changed", "job.leg_changed", "trip.leg_changed"]:
                    leg = str(payload.get("leg") or payload.get("logistics_leg") or "").strip().upper()
                    if sr.service_category not in LOGISTICS_CATEGORIES:
                        logger.warning(
                            "Ignoring leg_changed for non-logistics booking %s (category=%s)",
                            sr.id, sr.service_category,
                        )
                    else:
                        try:
                            sr.set_logistics_leg(leg)
                        except ValueError:
                            # A bad leg value is a vendor-side bug, not a
                            # reason to 500 the webhook. Log it and move on
                            # rather than writing garbage into a field the
                            # customer-facing tracking UI reads.
                            logger.warning("Rejected invalid logistics leg %r for booking %s", leg, sr.id)
                        else:
                            # DELIVERED is the moment every input to the final
                            # fare exists: stops completed, extra work
                            # approved, distance travelled. This is where the
                            # estimate becomes the amount actually charged.
                            if leg in ("DELIVERED", "COMPLETED"):
                                self._reconcile_final_fare(sr, payload)
                            transaction.on_commit(lambda: self._broadcast_event(sr, "logistics_leg_changed"))

                # ── 12c. TRIP STOP PROGRESS (GT-D-01) ───────────────────────────────
                elif event_type in ["trip.stop_arrived", "trip.stop_completed", "job.stop_progress"]:
                    self._record_stop_progress(sr, event_type, payload)

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

                # ── 14. DISPATCH DELAYED NOTIFICATION (GT Phase 23) ──────────────────
                elif event_type in ["booking.dispatch_delayed", "job.dispatch_delayed"]:
                    failed_cycles = payload.get("failed_offer_cycles", 0)
                    delay_note = f"High demand: Dispatch matching taking longer than usual ({failed_cycles} search cycles completed)."
                    if hasattr(sr, "notes") and sr.notes:
                        if "Dispatch matching taking longer" not in sr.notes:
                            sr.notes = f"{sr.notes}\n{delay_note}"
                    elif hasattr(sr, "notes"):
                        sr.notes = delay_note
                    try:
                        sr.save(update_fields=["updated_at"] + (["notes"] if hasattr(sr, "notes") else []))
                    except Exception as note_err:
                        logger.warning("Could not update notes on booking %s for dispatch_delayed: %s", sr.id, note_err)
                    transaction.on_commit(lambda: self._broadcast_event(sr, "booking_dispatch_delayed"))

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

    @staticmethod
    def _reconcile_fare(sr, payload):
        """
        GT-C-01: build the estimated-vs-final fare record at completion.

        `actual_distance_km` is the one number taken from the completion
        payload, and it is a FACT ABOUT THE TRIP, not a price -- it is
        re-priced here using the rates already locked into the stored
        quote. A payload can never supply an amount.

        Never raises into the webhook: a reconciliation failure must not
        prevent a job from being marked complete. It leaves the booking
        with its quoted fare, which is the safe direction to fail.
        """
        from service_requests.services.fare_reconciliation import reconcile_booking_fare

        try:
            actual_km = (
                payload.get("actual_distance_km")
                or payload.get("distance_km")
                or payload.get("trip_distance_km")
            )
            reconcile_booking_fare(sr, actual_distance_km=actual_km)
        except Exception as exc:
            logger.warning("Fare reconciliation failed for booking %s: %s", sr.id, exc)

    @staticmethod
    def _resolve_stop(sr, payload):
        """
        Find the TripStop a webhook payload refers to, by explicit id or by
        1-based sequence. Returns None when the booking has no stops (the
        ordinary single-drop case) or the reference doesn't match -- callers
        treat that as "applies to the booking as a whole", never as an error.
        """
        from service_requests.models import TripStop

        stop_id = payload.get("stop_id") or payload.get("trip_stop_id")
        if stop_id is not None:
            return TripStop.objects.filter(booking=sr, id=stop_id).first()
        sequence = payload.get("stop_sequence") or payload.get("sequence")
        if sequence is not None:
            return TripStop.objects.filter(booking=sr, sequence=sequence).first()
        return None

    @classmethod
    def _record_stop_progress(cls, sr, event_type, payload):
        """
        GT-D-01: advance per-stop progress (arrived_at / completed_at).

        Idempotent -- the vendor webhook may retry, and a stop that is
        already marked arrived must not have its timestamp rewritten to a
        later time, or the trip timeline would drift every retry.
        """
        stop = cls._resolve_stop(sr, payload)
        if stop is None:
            logger.warning(
                "Stop progress event %s for booking %s did not resolve to a TripStop (payload keys: %s)",
                event_type, sr.id, sorted(payload.keys()),
            )
            return

        completed = event_type == "trip.stop_completed" or bool(payload.get("completed"))
        fields = []
        now = timezone.now()
        if stop.arrived_at is None:
            stop.arrived_at = now
            fields.append("arrived_at")
        if completed and stop.completed_at is None:
            stop.completed_at = now
            fields.append("completed_at")
        if fields:
            # `transaction` is imported inside post() in this module, not at
            # module level, so import it locally here too.
            from django.db import transaction

            stop.save(update_fields=fields)
            transaction.on_commit(lambda: cls._broadcast_event(sr, "trip_stop_progress"))

    @classmethod
    def _reconcile_final_fare(cls, sr, payload):
        """
        Turn the booking's estimate into the final fare once the trip is
        delivered.

        This is the SECOND of two call sites, and both of them run in
        production.

        The first is _reconcile_fare(), wired to the `service_completed`
        event. An earlier version of this docstring claimed the vendor app
        never emits `service_completed` and that the final-fare step
        therefore never ran. That was wrong, and it was wrong because the
        claim rested on a truncated search of the vendor codebase. The
        vendor DOES emit it: service_requests/state_machine.py maps
        "completed" -> "service_completed" in _CUSTOMER_WEBHOOK_EVENT_MAP
        and calls notify_customer_app() on every transition, and
        apply_transition(job, "completed") is reached from three paths in
        workforce_api/views.py plus the complete_stuck_paid_jobs management
        command. Reconciliation at completion is live.

        This hook attaches the same reconciliation to the DELIVERED leg,
        which the vendor also emits (via set_logistics_leg on the proof
        endpoint). For Goods & Transport that is the meaningful "the trip is
        over" moment, and it can land before the status flips to completed,
        so a delivered trip gets its final fare without waiting on the
        status transition.

        Both call sites are safe together: reconcile_booking_fare is
        idempotent (update_or_create keyed on the booking), so whichever
        arrives second simply refreshes the row.

        `actual_distance_km` is used only when the vendor app reports a
        measured trip distance, and NEITHER event currently carries one --
        no notify_customer_app() call in the vendor codebase sets
        actual_distance_km, distance_km or trip_distance_km. So in practice
        both call sites reconcile stops, approved extra work and the minimum
        fare locked into the quote -- all exact recorded facts -- and leave
        distance variance unapplied. Charging distance variance needs the
        vendor to include a measured trip distance on one of these events;
        deriving one from the GPS trail here was considered and rejected,
        because a haversine sum over jittery fixes overstates distance and
        would quietly overcharge.

        Fire-and-forget, and idempotent on the receiving side
        (update_or_create keyed on the booking), so a retried DELIVERED
        event cannot double-adjust a fare and a reconciliation failure can
        never undo the delivery it accompanied.
        """
        from service_requests.services.fare_reconciliation import reconcile_booking_fare

        try:
            measured = (
                payload.get("actual_distance_km")
                or payload.get("distance_km")
                or payload.get("trip_distance_km")
            )
            recon = reconcile_booking_fare(sr, actual_distance_km=measured)
            if recon is not None and recon.delta:
                logger.info(
                    "Fare reconciled for booking %s: estimate %s -> final %s (delta %s)",
                    sr.request_id, recon.estimated_amount, recon.final_amount, recon.delta,
                )
        except Exception as exc:
            logger.warning(
                "Could not reconcile the final fare for booking %s: %s",
                getattr(sr, "request_id", sr.pk), exc,
            )

    @classmethod
    def _record_delivery_proof(cls, sr, payload):
        """
        GT-D-01: persist a proof-of-delivery artefact.

        Accepts whichever evidence the driver app actually captured -- any
        of a photo URL, a signature image, a recipient name/phone, an OTP
        confirmation, or a note -- and writes one DeliveryProof row per
        distinct kind. Never raises into the webhook: a proof that fails to
        record must not roll back the completion event it accompanied.

        Idempotent per (booking, stop, kind, value). The event-id replay
        guard alone is not enough here: a driver who loses the network
        mid-upload retries, the vendor's proof endpoint accepts the
        re-submission (it upserts a single PostServiceProof and explicitly
        allows a repeat while the job is in proof_submitted), and it emits a
        FRESH event with a new id. Same delivery, same photo, different
        event -- so without this the customer would see the same signature
        and recipient listed twice on their tracking screen.
        """
        from service_requests.models import DeliveryProof

        def _record(proof_type, **extra):
            """Create this proof unless an identical one is already stored."""
            lookup = dict(
                booking=common["booking"], stop=common["stop"],
                proof_type=proof_type,
            )
            # The value that identifies this evidence: the image reference
            # for a photo/signature, the recipient for a name, the note for
            # a note. OTP has no value of its own -- one confirmed OTP per
            # stop is one fact, not several.
            if "image" in extra:
                lookup["image"] = extra["image"]
            elif proof_type == DeliveryProof.ProofType.RECIPIENT_NAME:
                lookup["recipient_name"] = common["recipient_name"]
            elif proof_type == DeliveryProof.ProofType.NOTE:
                lookup["notes"] = extra.get("notes", "")
            _obj, was_created = DeliveryProof.objects.get_or_create(
                defaults={**common, **extra}, **lookup
            )
            return 1 if was_created else 0

        try:
            stop = cls._resolve_stop(sr, payload)
            loc = payload.get("location") or {}
            common = dict(
                booking=sr,
                stop=stop,
                recipient_name=str(payload.get("recipient_name") or "")[:200],
                recipient_phone=str(payload.get("recipient_phone") or "")[:30],
                captured_by_name=str(payload.get("technician_name") or sr.technician_name or "")[:200],
                captured_by_workforce_id=str(payload.get("workforce_employee_id") or "")[:64],
                latitude=loc.get("latitude"),
                longitude=loc.get("longitude"),
            )

            created = 0   # rows actually written by this event
            supplied = 0  # kinds of evidence the payload carried at all
            notes = str(payload.get("notes") or payload.get("remarks") or "")

            # A photo/signature arrives as a URL from the vendor app's own
            # storage. ImageField holds the path; we store the reference we
            # were given rather than re-downloading someone else's file into
            # this backend's media root from inside a webhook.
            photo_ref = payload.get("photo_url") or payload.get("proof_image") or payload.get("image_url")
            if photo_ref:
                supplied += 1
                created += _record(
                    DeliveryProof.ProofType.PHOTO,
                    image=str(photo_ref), notes=notes,
                )

            signature_ref = payload.get("signature_url") or payload.get("signature_image")
            if signature_ref:
                supplied += 1
                created += _record(
                    DeliveryProof.ProofType.SIGNATURE, image=str(signature_ref),
                )

            if common["recipient_name"]:
                supplied += 1
                created += _record(DeliveryProof.ProofType.RECIPIENT_NAME)

            if payload.get("otp_verified"):
                supplied += 1
                created += _record(DeliveryProof.ProofType.OTP)

            # Only fall back to a bare note if nothing stronger was supplied,
            # so a note doesn't duplicate the photo row's own notes field.
            # Keyed on `supplied`, not `created`: on a retry every kind is
            # already stored, and treating that as "nothing was supplied"
            # would invent a bare note the first delivery never had.
            if supplied == 0 and notes:
                supplied += 1
                created += _record(DeliveryProof.ProofType.NOTE, notes=notes)

            if supplied == 0:
                logger.warning(
                    "completion_proof event for booking %s carried no usable evidence (payload keys: %s)",
                    sr.id, sorted(payload.keys()),
                )
            elif created == 0:
                logger.info(
                    "completion_proof event for booking %s was a repeat -- every artefact it "
                    "carried is already recorded; nothing duplicated.", sr.id,
                )
        except Exception as exc:
            logger.warning("Failed to record delivery proof for booking %s: %s", sr.id, exc)

    @classmethod
    def _broadcast_event(cls, sr, event_type):
        # Was followed by a second `except Exception as e:` clause that was
        # unreachable (the first except already catches everything) and, even
        # if it had been reachable, wrongly returned an HTTP Response from a
        # transaction.on_commit() callback whose return value is discarded --
        # looked like a copy-paste leftover from post()'s own exception
        # handler. Removed; behaviour is unchanged since it never executed.
        try:
            from service_requests.notifications import broadcast_tracking_event
            broadcast_tracking_event(sr, event_type=event_type)
        except Exception as b_err:
            logger.warning(f"Error broadcasting {event_type}: {b_err}")

    @classmethod
    def _safe_notify_delay(cls, sr, reason, delay_count, revised_date):
        # Same fire-and-forget-but-logged shape as the broadcasts: a mail
        # failure must never turn the webhook itself into an error response,
        # because the vendor app does not retry.
        try:
            from service_requests.notifications import notify_customer_technician_delayed
            notify_customer_technician_delayed(
                sr, reason=reason, delay_count=delay_count, new_date=revised_date,
            )
        except Exception as exc:
            logger.warning(
                "Could not send technician-delay notification for %s: %s",
                getattr(sr, "request_id", sr.pk), exc,
            )

    @classmethod
    def _broadcast_delay_event(cls, sr, message, failed_cycles=None):
        # Same fire-and-forget-but-logged shape as _broadcast_event above --
        # a failure here must never affect the webhook's own success
        # response. Builds the normal tracking payload and adds the delay
        # message/cycle count on top, rather than introducing a parallel
        # payload shape the frontend would need a special case for.
        try:
            from service_requests.notifications import broadcast_tracking_event
            from service_requests.views import _build_tracking_payload
            tracking_payload = _build_tracking_payload(sr, has_full_access=True)
            tracking_payload["dispatch_delay_message"] = message
            if failed_cycles is not None:
                tracking_payload["dispatch_failed_offer_cycles"] = failed_cycles
            broadcast_tracking_event(sr, event_type="booking_dispatch_delayed", custom_data=tracking_payload)
        except Exception as b_err:
            logger.warning(f"Error broadcasting booking_dispatch_delayed: {b_err}")

    @classmethod
    def _notify(cls, notify_fn, sr):
        # Small wrapper so a notification failure (bad email config, etc.)
        # can never affect the webhook's own success response -- same
        # fire-and-forget-but-visible pattern as _broadcast_event above.
        try:
            notify_fn(sr)
        except Exception as n_err:
            logger.warning(f"Error sending {getattr(notify_fn, '__name__', notify_fn)} notification: {n_err}")

    @classmethod
    def _process_referral(cls, sr):
        # HS-A-06: same fire-and-forget-but-logged shape as _notify -- a
        # referral reward failing to process must never affect the booking
        # completion webhook's own success response.
        try:
            from service_requests.services import process_referral_completion
            process_referral_completion(sr)
        except Exception as ref_err:
            logger.warning(f"Error processing referral completion for booking {sr.id}: {ref_err}")


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
            # Fixes the same webhook-auth bypass as _verify_webhook_signature
            # above -- this used to also accept the well-known default
            # strings unconditionally, regardless of the configured secret.
            if not hmac.compare_digest(provided_secret, WORKFORCE_WEBHOOK_SECRET):
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

        # Trigger booking confirmation notification (SMS with live tracking URL + Email)
        try:
            from service_requests.notifications import send_booking_confirmation
            from django.conf import settings
            if getattr(settings, "TESTING", False):
                send_booking_confirmation(new_sr)
            else:
                import threading
                threading.Thread(
                    target=send_booking_confirmation,
                    args=(new_sr,),
                    daemon=True,
                ).start()
        except Exception as notify_err:
            logger.warning(f"Could not start booking confirmation notification for quote booking {new_sr.id}: {notify_err}")

        return Response({
            "success": True,
            "request_id": new_sr.request_id,
            "tracking_token": str(new_sr.tracking_token) if new_sr.tracking_token else None
        }, status=status.HTTP_201_CREATED)


class WorkforceCatalogListView(APIView):
    """
    GET /api/workforce-integration/catalog/
    Read-only categories + services (the "skills" a vendor can request to
    serve), for the Workforce app to show its vendors a picker when they
    apply. Same shared-secret auth as the rest of this module -- the
    Workforce app has no user session to send.

    Deliberately reuses CatalogCategory/Service directly rather than going
    through the customer-facing public endpoints (those exclude inactive
    rows and don't nest services under categories) -- a vendor should be
    able to see (and request) a Service even while admin is still setting
    it up, since the approval step below is the actual gate.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not _verify_webhook_signature(request):
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        from service_requests.models import CatalogCategory
        from service_requests.serializers import ServiceSerializer

        categories = CatalogCategory.objects.filter(is_active=True).order_by("sort_order", "name").prefetch_related("services")
        data = []
        for cat in categories:
            services = ServiceSerializer(cat.services.filter(is_active=True).order_by("sort_order", "name"), many=True).data
            data.append({
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "services": services,
            })
        return Response({"success": True, "data": data})


class WorkforceCapabilityRequestListCreateView(APIView):
    """
    GET  /api/workforce-integration/vendor-capabilities/?vendor_id=<id>
      -> that vendor's own requests (any status), so the Workforce app can
         show "pending" / "approved" / "rejected" against each skill.
    POST /api/workforce-integration/vendor-capabilities/
      body: {"vendor_id": "...", "vendor_name": "...", "service_ids": [1, 2, ...], "note": "..."}
      -> creates a PENDING request per service_id not already requested by
         this vendor. Idempotent: re-submitting a service_id that already
         has a row (any status) leaves that row untouched rather than
         resetting an already-decided one back to PENDING.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not _verify_webhook_signature(request):
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        from service_requests.models import VendorCapabilityRequest
        from service_requests.serializers import VendorCapabilityRequestSerializer

        vendor_id = (request.GET.get("vendor_id") or "").strip()
        if not vendor_id:
            return Response({"error": "vendor_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = VendorCapabilityRequest.objects.select_related("service", "service__category").filter(vendor_id=vendor_id)
        status_filter = (request.GET.get("status") or "").strip().upper()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response({"success": True, "data": VendorCapabilityRequestSerializer(qs, many=True).data})

    def post(self, request):
        if not _verify_webhook_signature(request):
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        from service_requests.models import VendorCapabilityRequest, Service
        from service_requests.serializers import VendorCapabilityRequestSerializer

        data = request.data
        vendor_id = str(data.get("vendor_id") or "").strip()
        vendor_name = str(data.get("vendor_name") or "").strip()
        service_ids = data.get("service_ids") or ([data["service_id"]] if data.get("service_id") else [])
        note = str(data.get("note") or "").strip()

        if not vendor_id:
            return Response({"error": "vendor_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not service_ids:
            return Response({"error": "service_ids (or service_id) is required"}, status=status.HTTP_400_BAD_REQUEST)

        created, already_existing = [], []
        for service_id in service_ids:
            service = Service.objects.filter(pk=service_id).first()
            if not service:
                continue
            row, was_created = VendorCapabilityRequest.objects.get_or_create(
                vendor_id=vendor_id,
                service=service,
                defaults={"vendor_name": vendor_name, "note": note},
            )
            (created if was_created else already_existing).append(row)

        all_rows = created + already_existing
        return Response({
            "success": True,
            "data": VendorCapabilityRequestSerializer(all_rows, many=True).data,
            "created_count": len(created),
            "already_existing_count": len(already_existing),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

