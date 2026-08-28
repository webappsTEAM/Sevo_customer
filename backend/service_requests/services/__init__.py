"""
service_requests/services/__init__.py

Business logic for:
  - Slice 2: RescheduleRequest
  - Slice 3: RefundRequest
  - Slice 4: Complaint / ComplaintMessage
  - Available customer actions and booking workflows

Rules:
  - Decoupled from local employee models (delegates to WorkforceIntegrationService when needed)
  - All querysets scoped to customer / admin personas
  - Clean domain exceptions via rest_framework.exceptions
"""
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from workforce_integration.services import WorkforceIntegrationService
from django.conf import settings
import logging

from service_requests.models import (
    RescheduleRequest, RescheduleStatus, RescheduleReason, TimeSlotChoices, RescheduleAttachment,
    RescheduleRejectionReason,
    RefundRequest, RefundStatus, RefundType, RefundReason, RefundInfoTarget, RefundEvidence,
    Complaint, ComplaintAttachment, ComplaintMessage, ComplaintStatusHistory,
    ServiceRequest, Payment,
    CustomerWallet, WalletTransaction,
    InsuranceClaim, InsuranceClaimAttachment,
    TripStop,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# STATE MACHINES
# ═══════════════════════════════════════════════════════════════════════════════

_RESCHEDULE_TRANSITIONS = {
    RescheduleStatus.PENDING: {
        RescheduleStatus.PENDING_ADMIN_REVIEW,
        RescheduleStatus.ADMIN_REVIEW,
        RescheduleStatus.ADMIN_APPROVED,
        RescheduleStatus.SLOT_SUGGESTED,
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
        RescheduleStatus.CANCELLED,
        RescheduleStatus.RESCHEDULED,
    },
    RescheduleStatus.PENDING_ADMIN_REVIEW: {
        RescheduleStatus.ADMIN_REVIEW,
        RescheduleStatus.ADMIN_APPROVED,
        RescheduleStatus.SLOT_SUGGESTED,
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
        RescheduleStatus.CANCELLED,
        RescheduleStatus.RESCHEDULED,
    },
    RescheduleStatus.ADMIN_REVIEW: {
        RescheduleStatus.ADMIN_APPROVED,
        RescheduleStatus.SLOT_SUGGESTED,
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
        RescheduleStatus.CANCELLED,
    },
    RescheduleStatus.ADMIN_APPROVED: {
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
    },
    RescheduleStatus.SLOT_SUGGESTED: {
        RescheduleStatus.ADMIN_REVIEW,
        RescheduleStatus.CUSTOMER_ACCEPTED_SUGGESTION,
        RescheduleStatus.CANCELLED_SUGGESTION,
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
    },
    RescheduleStatus.CUSTOMER_ACCEPTED_SUGGESTION: {
        RescheduleStatus.RESCHEDULED,
        RescheduleStatus.REJECTED,
    },
    RescheduleStatus.CANCELLED_SUGGESTION: {
        RescheduleStatus.ADMIN_REVIEW,
        RescheduleStatus.REJECTED,
    },
    RescheduleStatus.APPROVED: {
        RescheduleStatus.CUSTOMER_NOTIFIED,
        RescheduleStatus.RESCHEDULED,
    },
    RescheduleStatus.CUSTOMER_NOTIFIED: {
        RescheduleStatus.RESCHEDULED,
    },
    RescheduleStatus.RESCHEDULED: set(),
    RescheduleStatus.REJECTED:    set(),
    RescheduleStatus.CANCELLED:   set(),
}

_REFUND_TRANSITIONS = {
    RefundStatus.PENDING:          {RefundStatus.INFO_REQUESTED, RefundStatus.APPROVED_FULL, RefundStatus.APPROVED_PARTIAL, RefundStatus.REJECTED},
    RefundStatus.INFO_REQUESTED:   {RefundStatus.PENDING, RefundStatus.REJECTED},
    RefundStatus.APPROVED_FULL:    {RefundStatus.SENT_TO_FINANCE},
    RefundStatus.APPROVED_PARTIAL: {RefundStatus.SENT_TO_FINANCE},
    RefundStatus.SENT_TO_FINANCE:  {RefundStatus.COMPLETED},
    RefundStatus.COMPLETED:        set(),
    RefundStatus.REJECTED:         set(),
}


def get_customer_available_actions(booking):
    """
    Returns available self-service actions for a booking based on its status.
    """
    status = booking.status
    actions = {
        "can_cancel": False,
        "can_reschedule": False,
        "can_pay": False,
        "can_track": False,
        "can_give_feedback": False,
        "can_request_refund": False,
    }

    if status in ["new_request", "confirmed", "assigned", "accepted", "received"]:
        actions["can_cancel"] = True
        actions["can_reschedule"] = True

    if booking.payment_status in ["pending", "failed"] and booking.payment_method == "ONLINE":
        actions["can_pay"] = True

    if status in ["confirmed", "assigned", "accepted", "on_the_way", "arrived", "in_progress", "started", "dispatched"]:
        actions["can_track"] = True

    if status in ["completed", "verified", "closed"]:
        actions["can_give_feedback"] = not hasattr(booking, "feedback") or not booking.feedback.is_submitted
        if hasattr(booking, "_prefetched_objects_cache") and "refund_requests" in booking._prefetched_objects_cache:
            actions["can_request_refund"] = not bool(booking.refund_requests.all())
        else:
            actions["can_request_refund"] = not booking.refund_requests.exists()

    return actions


def auto_reassign_technician(reschedule_request):
    """
    Notifies external workforce management system of reschedule request.
    """
    booking = reschedule_request.booking
    return WorkforceIntegrationService.reschedule_workforce_job(
        booking_id=booking.id,
        new_date=reschedule_request.new_date,
        new_time_slot=reschedule_request.new_time_slot,
    )


def suggest_alternate_slot(reschedule_request):
    """
    Returns next available time slots for customer/admin review.
    """
    from datetime import timedelta
    start_date = reschedule_request.new_date or timezone.now().date()
    slots_choices = [c[0] for c in TimeSlotChoices.choices]
    suggestions = []

    for day_offset in range(1, 4):
        check_date = start_date + timedelta(days=day_offset)
        for slot in slots_choices:
            suggestions.append({
                "date": check_date.strftime("%Y-%m-%d"),
                "time_slot": slot,
                "is_available": True
            })
            if len(suggestions) >= 3:
                break
        if len(suggestions) >= 3:
            break

    reschedule_request.alternate_slots_suggested = suggestions
    reschedule_request.save(update_fields=["alternate_slots_suggested"])
    return suggestions


def get_real_technician_availability(company, target_date):
    """
    Returns available booking slots for a given date.
    """
    slots = []
    for slot_code, slot_label in TimeSlotChoices.choices:
        slots.append({
            "time_slot": slot_code,
            "label": slot_label,
            "available_count": 5,
            "total_technicians": 5,
            "is_available": True,
        })
    return slots


# ═══════════════════════════════════════════════════════════════════════════════
# RESCHEDULE SERVICE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# HS-B-08: self-serve reschedule policy. A customer request landing at least
# this many hours before their *current* scheduled slot, for a new slot that
# still has capacity, is auto-approved instantly instead of waiting on an
# admin. Anything closer to the appointment, or a slot at/over capacity,
# still goes through the existing manual admin queue unchanged -- this is
# additive, it never removes the manual path.
RESCHEDULE_AUTO_APPROVE_WINDOW_HOURS = int(getattr(settings, "RESCHEDULE_AUTO_APPROVE_WINDOW_HOURS", 48))
RESCHEDULE_MAX_BOOKINGS_PER_SLOT = int(getattr(settings, "RESCHEDULE_MAX_BOOKINGS_PER_SLOT", 20))


def _slot_start_hour(time_slot):
    """'09-10' -> 9. Falls back to None for anything unparseable."""
    try:
        return int(str(time_slot).split("-")[0])
    except (ValueError, IndexError, TypeError):
        return None


def _current_slot_datetime(booking):
    """Best-effort datetime for the booking's *current* scheduled slot, used
    only to measure how much notice a reschedule request gives. Returns None
    if the booking has no usable preferred_date/preferred_time -- callers
    must treat that as "can't confirm enough notice" and fall back to manual
    review rather than guessing."""
    if not booking.preferred_date:
        return None
    hour = _slot_start_hour(booking.preferred_time)
    if hour is None:
        return None
    naive = timezone.datetime.combine(booking.preferred_date, timezone.datetime.min.time()).replace(hour=hour)
    return timezone.make_aware(naive) if timezone.is_naive(naive) else naive


def _slot_has_capacity(new_date, new_time_slot, exclude_booking_id=None):
    """Live capacity check against existing bookings in the same slot, across
    active (non-cancelled/rejected/completed) service requests. There is no
    dedicated slot-capacity model in this codebase -- this counts real rows,
    which is the same shape of check the booking-create path would need if
    slot capacity were enforced there too."""
    qs = ServiceRequest.objects.filter(
        preferred_date=new_date,
        preferred_time=new_time_slot,
    ).exclude(status__in=["cancelled", "rejected", "completed", "closed"])
    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)
    return qs.count() < RESCHEDULE_MAX_BOOKINGS_PER_SLOT


def create_reschedule_request(booking, requested_by, persona, new_date, new_time_slot, reason, additional_notes="", attachment=None):
    if booking.status in ["completed", "closed", "cancelled", "rejected"]:
        raise ValidationError({"detail": f"Cannot reschedule a booking in '{booking.get_status_display()}' status."})

    with transaction.atomic():
        rr = RescheduleRequest.objects.create(
            booking=booking,
            requested_by=requested_by,
            persona=persona,
            current_date=booking.preferred_date,
            current_time=booking.preferred_time,
            new_date=new_date,
            new_time_slot=new_time_slot,
            reason=reason,
            additional_notes=additional_notes,
            attachment=attachment,
            status=RescheduleStatus.PENDING,
        )

        RescheduleStatusHistory.objects.create(
            request=rr,
            from_status="NEW",
            to_status=RescheduleStatus.PENDING,
            changed_by=requested_by,
            note="Reschedule request created."
        )

        # HS-B-08: attempt self-serve auto-approval for customer-initiated
        # requests only (admin/system reschedules already bypass this queue
        # via their own dedicated actions, and auto-approving an admin's own
        # request would be meaningless).
        if persona == "CUSTOMER":
            current_dt = _current_slot_datetime(booking)
            notice_ok = bool(
                current_dt and
                current_dt - timezone.now() >= timezone.timedelta(hours=RESCHEDULE_AUTO_APPROVE_WINDOW_HOURS)
            )
            if notice_ok and _slot_has_capacity(new_date, new_time_slot, exclude_booking_id=booking.id):
                try:
                    apply_reschedule_transition(
                        reschedule_request=rr,
                        new_status=RescheduleStatus.RESCHEDULED,
                        actor=requested_by,
                        note=(
                            f"Auto-approved: requested {RESCHEDULE_AUTO_APPROVE_WINDOW_HOURS}+ hours "
                            f"ahead of the current slot, with capacity available in the new slot."
                        ),
                    )
                    rr.refresh_from_db()
                except ValidationError:
                    # If the state machine ever rejects this transition for a
                    # reason we haven't accounted for, fail safe: leave the
                    # request PENDING for manual review rather than raising
                    # and losing the reschedule request the customer just
                    # submitted.
                    logger.warning("HS-B-08 auto-approve transition failed for RescheduleRequest %s; leaving PENDING for manual review.", rr.pk)

    return rr


def apply_reschedule_transition(reschedule_request, new_status, actor, note=""):
    current = reschedule_request.status
    allowed = _RESCHEDULE_TRANSITIONS.get(current, set())
    if new_status not in allowed and new_status != current:
        raise ValidationError({"detail": f"Invalid transition from '{current}' to '{new_status}'."})

    with transaction.atomic():
        reschedule_request.status = new_status
        reschedule_request.save(update_fields=["status", "updated_at"])

        RescheduleStatusHistory.objects.create(
            request=reschedule_request,
            from_status=current,
            to_status=new_status,
            changed_by=actor,
            note=note or f"Status changed to {new_status}."
        )

        # If terminal success, sync booking
        if new_status == RescheduleStatus.RESCHEDULED:
            booking = reschedule_request.booking
            booking.preferred_date = reschedule_request.new_date
            booking.preferred_time = reschedule_request.new_time_slot
            booking.status = "rescheduled"
            booking.save(update_fields=["preferred_date", "preferred_time", "status", "updated_at"])

            # Notify workforce
            WorkforceIntegrationService.reschedule_workforce_job(
                booking_id=booking.id,
                new_date=reschedule_request.new_date,
                new_time_slot=reschedule_request.new_time_slot,
            )

    return reschedule_request


def admin_approve_reschedule(admin, request_id, notes=""):
    try:
        rr = RescheduleRequest.objects.select_related("booking").get(pk=request_id)
    except RescheduleRequest.DoesNotExist:
        raise NotFound({"detail": f"RescheduleRequest #{request_id} not found."})

    rr.admin_reviewed_by = admin
    rr.review_notes = notes
    rr.reviewed_at = timezone.now()
    rr.approved_date = rr.new_date
    rr.approved_time = rr.new_time_slot
    rr.save(update_fields=["admin_reviewed_by", "review_notes", "reviewed_at", "approved_date", "approved_time"])

    return apply_reschedule_transition(rr, RescheduleStatus.RESCHEDULED, admin, note=notes or "Admin approved reschedule.")


def admin_reject_reschedule(admin, request_id, reason, notes=""):
    try:
        rr = RescheduleRequest.objects.get(pk=request_id)
    except RescheduleRequest.DoesNotExist:
        raise NotFound({"detail": f"RescheduleRequest #{request_id} not found."})

    rr.admin_reviewed_by = admin
    rr.rejection_reason = reason
    rr.rejection_notes = notes
    rr.reviewed_at = timezone.now()
    rr.save(update_fields=["admin_reviewed_by", "rejection_reason", "rejection_notes", "reviewed_at"])

    return apply_reschedule_transition(rr, RescheduleStatus.REJECTED, admin, note=f"Rejected: {notes}")


def list_reschedule_requests(actor, persona, filters=None):
    qs = RescheduleRequest.objects.select_related("booking", "requested_by", "admin_reviewed_by")

    if persona == "CUSTOMER":
        qs = qs.filter(requested_by=actor)

    if filters:
        status_filter = filters.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

    return qs.order_by("-created_at")


# ═══════════════════════════════════════════════════════════════════════════════
# REFUND SERVICE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_refund_request(booking, customer, amount, reason, additional_notes="", refund_type=RefundType.FULL):
    with transaction.atomic():
        rr = RefundRequest.objects.create(
            booking=booking,
            customer=customer,
            requested_by=customer,
            amount=amount,
            paid_amount=booking.total_amount,
            requested_amount=amount,
            refund_type=refund_type,
            reason=reason,
            additional_notes=additional_notes,
            status=RefundStatus.PENDING,
        )
    return rr


def apply_refund_transition(refund_request, new_status, actor, note=None, approved_amount=None, info_requested_from=None):
    current = refund_request.status
    allowed = _REFUND_TRANSITIONS.get(current, set())
    if new_status not in allowed and new_status != current:
        raise ValidationError({"detail": f"Invalid transition from '{current}' to '{new_status}'."})

    with transaction.atomic():
        refund_request.status = new_status
        if approved_amount is not None:
            refund_request.approved_amount = approved_amount
        if info_requested_from:
            refund_request.info_requested_from = info_requested_from
        if note:
            refund_request.admin_notes = f"{refund_request.admin_notes}\n[{timezone.now()}] {note}".strip()

        refund_request.save()

    return refund_request


def admin_approve_refund(admin_user, refund_id, is_full=True, approved_amount=None, internal_note=""):
    try:
        rr = RefundRequest.objects.get(pk=refund_id)
    except RefundRequest.DoesNotExist:
        raise ValidationError({"detail": "RefundRequest not found."})

    target_status = RefundStatus.APPROVED_FULL if is_full else RefundStatus.APPROVED_PARTIAL
    app_amount = rr.requested_amount if (is_full or not approved_amount) else Decimal(str(approved_amount))

    return apply_refund_transition(
        refund_request=rr,
        new_status=target_status,
        actor=admin_user,
        note=internal_note,
        approved_amount=app_amount
    )


def admin_reject_refund(admin_user, refund_id, internal_note=""):
    try:
        rr = RefundRequest.objects.get(pk=refund_id)
    except RefundRequest.DoesNotExist:
        raise ValidationError({"detail": "RefundRequest not found."})

    return apply_refund_transition(
        refund_request=rr,
        new_status=RefundStatus.REJECTED,
        actor=admin_user,
        note=internal_note
    )


def admin_send_to_finance(admin_user, refund_id):
    try:
        rr = RefundRequest.objects.get(pk=refund_id)
    except RefundRequest.DoesNotExist:
        raise ValidationError({"detail": "RefundRequest not found."})

    return apply_refund_transition(
        refund_request=rr,
        new_status=RefundStatus.SENT_TO_FINANCE,
        actor=admin_user,
        note="Approved refund submitted to Finance department for payout processing."
    )


def _execute_gateway_refund(rr):
    """
    Fixes HS-C-04/HS-C-05: previously admin_complete_refund() just flipped
    the status to COMPLETED with no gateway call at all -- and wasn't even
    reachable from any view (see HS_C_04_05_REFUND_GATEWAY_NOTE.md for the
    original diagnosis). This actually calls Razorpay's refund API against
    the original payment before allowing completion.

    Returns the gateway's refund id (str) on success. Raises ValidationError
    on any failure -- the caller must NOT transition to COMPLETED if this
    raises, so a refund that didn't actually happen can never be recorded
    as if it had.
    """
    payment = (
        Payment.objects.filter(
            service_request=rr.booking,
            status=ServiceRequest.PaymentStatus.PAID,
        )
        .exclude(razorpay_payment_id__isnull=True)
        .exclude(razorpay_payment_id="")
        .order_by("-created_at")
        .first()
    )
    if not payment:
        raise ValidationError({
            "detail": "No paid, gateway-verified Payment record found for this booking -- "
                      "cannot issue a gateway refund without knowing what to refund. If this "
                      "booking was paid by cash (COD), settle it outside the payment gateway "
                      "instead of completing it here."
        })

    refund_amount = rr.approved_amount if rr.approved_amount else rr.requested_amount
    if not refund_amount or refund_amount <= 0:
        raise ValidationError({"detail": "Refund amount must be greater than zero."})
    if refund_amount > payment.amount:
        raise ValidationError({
            "detail": f"Refund amount (Rs. {refund_amount}) exceeds the original payment "
                      f"(Rs. {payment.amount}) -- cannot refund more than was paid."
        })

    gateway_configured = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)

    if not gateway_configured:
        # Same fail-closed rule as PaymentVerifyView (HS-C-01/EC-06): never
        # silently pretend a refund happened. Sandbox mode exists only for
        # local/dev testing where there is no real gateway to call.
        if getattr(settings, "PAYMENT_SANDBOX_MODE", False):
            return f"sandbox_refund_{payment.razorpay_payment_id}"
        raise ValidationError({
            "detail": "Payment gateway is not configured -- cannot issue a real refund. "
                      "Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET, or process this refund "
                      "manually outside the system and record the reference separately."
        })

    try:
        import razorpay
    except ImportError:
        logger.error("razorpay package not installed but RAZORPAY_KEY_ID/SECRET are configured.")
        raise ValidationError({"detail": "Payment gateway is misconfigured. Please contact support."})

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        response = client.payment.refund(payment.razorpay_payment_id, {
            "amount": int(Decimal(refund_amount) * 100),  # paise
            "notes": {
                "refund_id": rr.refund_id or "",
                "booking_id": str(rr.booking_id),
                "request_id": rr.booking.request_id if rr.booking else "",
            },
        })
    except Exception as e:
        logger.error(f"Razorpay refund failed for RefundRequest {rr.id} (payment {payment.razorpay_payment_id}): {e}")
        raise ValidationError({"detail": f"Gateway refund failed: {e}"})

    gateway_refund_id = response.get("id") if isinstance(response, dict) else None
    if not gateway_refund_id:
        logger.error(f"Razorpay refund for RefundRequest {rr.id} returned no id: {response}")
        raise ValidationError({"detail": "Gateway refund did not return a reference id -- treat as failed and check the Razorpay dashboard before retrying."})

    return gateway_refund_id


def admin_complete_refund(admin_user, refund_id):
    try:
        rr = RefundRequest.objects.get(pk=refund_id)
    except RefundRequest.DoesNotExist:
        raise ValidationError({"detail": "RefundRequest not found."})

    if rr.status != RefundStatus.SENT_TO_FINANCE:
        raise ValidationError({"detail": f"Refund must be in '{RefundStatus.SENT_TO_FINANCE}' status before it can be completed (currently '{rr.status}')."})

    gateway_refund_id = _execute_gateway_refund(rr)
    rr.gateway_reference = gateway_refund_id
    rr.save(update_fields=["gateway_reference"])

    return apply_refund_transition(
        refund_request=rr,
        new_status=RefundStatus.COMPLETED,
        actor=admin_user,
        note=f"Refund transaction completed via gateway (ref: {gateway_refund_id})."
    )


def list_refund_requests(actor, persona, filters=None):
    qs = RefundRequest.objects.select_related("booking", "customer").prefetch_related("evidence")
    if persona == "CUSTOMER":
        qs = qs.filter(Q(customer=actor) | Q(requested_by=actor))
    if filters and filters.get("status"):
        qs = qs.filter(status=filters["status"].upper())
    return qs.order_by("-created_at")


# ═══════════════════════════════════════════════════════════════════════════════
# WALLET SERVICE FUNCTIONS (HS-C-07)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Deliberately NOT wired into checkout/booking-create yet: applying a wallet
# debit at payment time means touching the same code path this session
# already hardened carefully for payment integrity (PaymentInitiateView/
# PaymentVerifyView), and doing that without a live environment to test the
# debit-then-gateway-fails-then-must-reverse edge case would be exactly the
# kind of money-movement change this remediation pass has been cautious
# about elsewhere (see the refund-gateway wiring). What's here is the
# complete, safe half: a real ledger customers and admins can already use
# for goodwill credits and referral rewards -- "apply wallet balance at
# checkout" is a natural, self-contained follow-up on top of this ledger.

def get_or_create_wallet(user):
    wallet, _ = CustomerWallet.objects.get_or_create(user=user)
    return wallet


def credit_wallet(user, amount, reason, note="", actor=None, reference_type="", reference_id=""):
    """Adds funds to a customer's wallet. amount must be > 0."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({"detail": "Credit amount must be greater than zero."})

    with transaction.atomic():
        wallet = CustomerWallet.objects.select_for_update().get_or_create(user=user)[0]
        wallet.balance = wallet.balance + amount
        wallet.save(update_fields=["balance", "updated_at"])

        tx = WalletTransaction.objects.create(
            wallet=wallet,
            tx_type=WalletTransaction.TxType.CREDIT,
            reason=reason,
            amount=amount,
            balance_after=wallet.balance,
            note=note,
            reference_type=reference_type,
            reference_id=str(reference_id) if reference_id else "",
            created_by=actor,
        )
    return tx


def debit_wallet(user, amount, reason, note="", actor=None, reference_type="", reference_id=""):
    """Removes funds from a customer's wallet. Fails closed on insufficient
    balance -- never lets a wallet go negative."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({"detail": "Debit amount must be greater than zero."})

    with transaction.atomic():
        wallet = CustomerWallet.objects.select_for_update().get_or_create(user=user)[0]
        if wallet.balance < amount:
            raise ValidationError({"detail": f"Insufficient wallet balance: have {wallet.balance}, need {amount}."})

        wallet.balance = wallet.balance - amount
        wallet.save(update_fields=["balance", "updated_at"])

        tx = WalletTransaction.objects.create(
            wallet=wallet,
            tx_type=WalletTransaction.TxType.DEBIT,
            reason=reason,
            amount=amount,
            balance_after=wallet.balance,
            note=note,
            reference_type=reference_type,
            reference_id=str(reference_id) if reference_id else "",
            created_by=actor,
        )
    return tx


def list_wallet_transactions(user, limit=50):
    wallet = get_or_create_wallet(user)
    return wallet.transactions.all()[:limit]


# ═══════════════════════════════════════════════════════════════════════════════
# REFERRAL SERVICE FUNCTIONS (HS-A-06)
# ═══════════════════════════════════════════════════════════════════════════════

REFERRAL_REFERRER_REWARD = Decimal(str(getattr(settings, "REFERRAL_REFERRER_REWARD", "100.00")))
REFERRAL_REFEREE_REWARD = Decimal(str(getattr(settings, "REFERRAL_REFEREE_REWARD", "50.00")))


def link_referral(referee_user, code):
    """
    Called once, right after a new customer account is created, if a
    referral code was supplied. Idempotent by construction: referee has a
    OneToOneField, so a second call for the same referee simply fails the
    uniqueness check, which we swallow -- a referee can only ever be
    referred once, by whoever's code they used first.
    """
    from accounts.models import ReferralCode, Referral
    code = (code or "").strip().upper()
    if not code:
        return None

    ref_code = ReferralCode.objects.filter(code=code).select_related("user").first()
    if not ref_code:
        logger.info("[Referral] Unknown referral code '%s' -- ignored.", code)
        return None
    if ref_code.user_id == referee_user.id:
        logger.info("[Referral] User %s tried to refer themselves -- ignored.", referee_user.id)
        return None

    try:
        return Referral.objects.create(referrer=ref_code.user, referee=referee_user, code_used=code)
    except Exception as exc:
        # Most likely: referee already has a Referral row (OneToOne
        # uniqueness). Not an error worth surfacing to the booking flow.
        logger.info("[Referral] Could not link referral for user %s: %s", referee_user.id, exc)
        return None


def process_referral_completion(booking):
    """
    Called (best-effort, from the booking-completion webhook path) whenever
    a booking transitions to completed. Rewards both referrer and referee
    the first time the REFEREE's own booking count reaches exactly 1
    completed booking -- this is what "qualifies" a referral, so a referee
    who books, cancels, and rebooks doesn't trigger multiple payouts, and a
    referrer isn't rewarded for a referee's 5th booking.
    """
    from accounts.models import Referral

    customer = booking.customer
    if not customer:
        return

    referral = Referral.objects.filter(referee=customer, status=Referral.Status.PENDING).select_related("referrer").first()
    if not referral:
        return

    completed_count = ServiceRequest.objects.filter(customer=customer, status="completed").count()
    if completed_count != 1:
        # Either this isn't the referee's first completed booking (reward
        # already should have fired earlier and referral is no longer
        # PENDING -- so this branch is really just "not yet 1"), or something
        # unusual -- either way, only qualify on exactly the first.
        return

    with transaction.atomic():
        referral.refresh_from_db()
        if referral.status != Referral.Status.PENDING:
            return  # Already processed by a concurrent call.

        try:
            credit_wallet(
                user=referral.referrer, amount=REFERRAL_REFERRER_REWARD, reason="REFERRAL",
                note=f"Referral reward: {customer.get_full_name() or customer.username} completed their first booking.",
                reference_type="Referral", reference_id=referral.pk,
            )
            credit_wallet(
                user=referral.referee, amount=REFERRAL_REFEREE_REWARD, reason="REFERRAL",
                note="Welcome reward for completing your first booking via a referral.",
                reference_type="Referral", reference_id=referral.pk,
            )
        except Exception as exc:
            logger.error("[Referral] Failed to credit reward for referral %s: %s", referral.pk, exc)
            return

        referral.status = Referral.Status.REWARDED
        referral.referrer_reward_amount = REFERRAL_REFERRER_REWARD
        referral.referee_reward_amount = REFERRAL_REFEREE_REWARD
        referral.rewarded_at = timezone.now()
        referral.save(update_fields=["status", "referrer_reward_amount", "referee_reward_amount", "rewarded_at"])
        logger.info("[Referral] Rewarded referral %s (referrer=%s, referee=%s).", referral.pk, referral.referrer_id, referral.referee_id)


# ═══════════════════════════════════════════════════════════════════════════════
# INSURANCE CLAIM SERVICE FUNCTIONS (GT-C-03)
# ═══════════════════════════════════════════════════════════════════════════════

def file_insurance_claim(booking, customer, description, claimed_amount, attachment_files=None):
    if not booking.insurance_opted_in:
        raise ValidationError({"detail": "This booking does not have insurance coverage."})
    if booking.customer_id != customer.id:
        raise PermissionDenied("You can only file a claim on your own booking.")
    if booking.status != "completed":
        raise ValidationError({"detail": "A claim can only be filed once the booking is completed."})

    claimed_amount = Decimal(str(claimed_amount))
    if claimed_amount <= 0:
        raise ValidationError({"detail": "Claimed amount must be greater than zero."})

    with transaction.atomic():
        claim = InsuranceClaim.objects.create(
            booking=booking,
            filed_by=customer,
            description=description,
            claimed_amount=claimed_amount,
        )
        for f in (attachment_files or []):
            att = InsuranceClaimAttachment.objects.create(file=f, original_name=f.name, uploaded_by=customer)
            claim.attachments.add(att)
    return claim


def resolve_insurance_claim(admin_user, claim_id, decision, approved_amount=None, notes=""):
    """decision: 'APPROVED', 'REJECTED', or 'PAID' (PAID is a separate step
    after APPROVED, matching the refund workflow's approve-then-complete
    shape elsewhere in this file)."""
    try:
        claim = InsuranceClaim.objects.select_related("booking").get(pk=claim_id)
    except InsuranceClaim.DoesNotExist:
        raise ValidationError({"detail": "Claim not found."})

    if decision == InsuranceClaim.Status.APPROVED:
        if claim.status != InsuranceClaim.Status.OPEN:
            raise ValidationError({"detail": f"Claim must be OPEN to approve (currently {claim.status})."})
        cap = claim.booking.insurance_liability_cap
        amount = Decimal(str(approved_amount)) if approved_amount is not None else claim.claimed_amount
        if cap is not None:
            amount = min(amount, cap)  # GT-C-03: never approve above the stated liability cap
        claim.approved_amount = amount
        claim.status = InsuranceClaim.Status.APPROVED

    elif decision == InsuranceClaim.Status.REJECTED:
        if claim.status != InsuranceClaim.Status.OPEN:
            raise ValidationError({"detail": f"Claim must be OPEN to reject (currently {claim.status})."})
        claim.status = InsuranceClaim.Status.REJECTED

    elif decision == InsuranceClaim.Status.PAID:
        if claim.status != InsuranceClaim.Status.APPROVED:
            raise ValidationError({"detail": f"Claim must be APPROVED before it can be paid (currently {claim.status})."})
        # Pay out via the wallet ledger -- consistent with how referral
        # rewards and goodwill credits move money in this codebase, and
        # avoids re-touching the Razorpay refund-gateway code for a claim
        # payout, which is a materially different transaction type.
        credit_wallet(
            user=claim.filed_by, amount=claim.approved_amount, reason="ADJUSTMENT",
            note=f"Insurance claim #{claim.pk} payout for booking {claim.booking.request_id}.",
            actor=admin_user, reference_type="InsuranceClaim", reference_id=claim.pk,
        )
        claim.status = InsuranceClaim.Status.PAID

    else:
        raise ValidationError({"detail": f"Unknown decision '{decision}'."})

    claim.resolution_notes = notes
    claim.resolved_by = admin_user
    claim.resolved_at = timezone.now()
    claim.save(update_fields=["status", "approved_amount", "resolution_notes", "resolved_by", "resolved_at", "updated_at"])
    return claim


def list_insurance_claims(actor, persona, filters=None):
    qs = InsuranceClaim.objects.select_related("booking", "filed_by")
    if persona == "CUSTOMER":
        qs = qs.filter(filed_by=actor)
    if filters and filters.get("status"):
        qs = qs.filter(status=filters["status"].upper())
    return qs.order_by("-created_at")


# ═══════════════════════════════════════════════════════════════════════════════
# COMPLAINT SERVICE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

COMPLAINT_ALLOWED_TRANSITIONS = {
    "OPEN": ["ASSIGNED", "CLOSED"],
    "ASSIGNED": ["UNDER_INVESTIGATION"],
    "UNDER_INVESTIGATION": ["WAITING_CUSTOMER", "ADMIN_REVIEW"],
    "WAITING_CUSTOMER": ["UNDER_INVESTIGATION"],
    "ADMIN_REVIEW": ["RESOLVED", "ESCALATED"],
    "ESCALATED": ["ADMIN_REVIEW"],
    "RESOLVED": ["CLOSED", "UNDER_INVESTIGATION"],
    "CLOSED": [],
}


def generate_complaint_number():
    last = Complaint.objects.order_by("-id").first()
    num = 1
    if last and last.complaint_number:
        try:
            num = int(last.complaint_number.split("-")[-1]) + 1
        except Exception:
            pass
    return f"CMP-{timezone.now().year}-{str(num).zfill(6)}"


def _apply_complaint_transition(complaint, new_status, actor, notes=None):
    current = complaint.status
    allowed = COMPLAINT_ALLOWED_TRANSITIONS.get(current, [])
    if new_status not in allowed and new_status != current:
        raise ValidationError({"detail": f"Cannot transition from {current} to {new_status}."})

    with transaction.atomic():
        complaint.status = new_status
        if new_status == "RESOLVED":
            complaint.resolved_at = timezone.now()
        elif new_status == "CLOSED":
            complaint.closed_at = timezone.now()
        complaint.save()

        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            from_status=current,
            to_status=new_status,
            changed_by=actor,
            notes=notes,
        )

    return complaint


def create_complaint(customer, booking, category, description, priority=None, attachment_files=None):
    with transaction.atomic():
        complaint = Complaint.objects.create(
            complaint_number=generate_complaint_number(),
            raised_by=customer,
            booking=booking,
            category=category,
            description=description,
            priority=priority or "MEDIUM",
            status="OPEN",
        )
        if attachment_files:
            for f in attachment_files:
                ComplaintAttachment.objects.create(
                    complaint=complaint,
                    file=f,
                    uploaded_by=customer,
                    attachment_type="IMAGE"
                )
    return complaint


def add_message(complaint, actor, persona, message):
    return ComplaintMessage.objects.create(
        complaint=complaint,
        sender=actor,
        sender_persona=persona,
        message=message,
    )


def add_customer_message(complaint, customer, message):
    is_admin = getattr(customer, "is_staff", False) or getattr(customer, "is_superuser", False) or getattr(customer, "role", "") in ("admin", "manager")
    if complaint.raised_by_id != customer.pk and not is_admin:
        raise PermissionDenied({"detail": "Not your complaint."})
    persona = "ADMIN" if is_admin else "CUSTOMER"
    return add_message(complaint, customer, persona, message)


def list_customer_complaints(customer, filters=None):
    qs = Complaint.objects.filter(raised_by=customer)
    if filters and filters.get("status"):
        qs = qs.filter(status=filters["status"].upper())
    return qs.order_by("-created_at")


def get_complaint_detail(customer, complaint_id):
    try:
        query = Q(pk=complaint_id) & Q(raised_by=customer)
        if getattr(customer, "is_staff", False) or getattr(customer, "is_superuser", False) or getattr(customer, "role", "") in ("admin", "manager"):
            query = Q(pk=complaint_id)
        return Complaint.objects.get(query)
    except Complaint.DoesNotExist:
        raise PermissionDenied({"detail": "Complaint not found or not owned by you."})


def assign_complaint(complaint, admin_actor, assigned_admin, priority=None):
    if priority:
        complaint.priority = priority
    complaint.assigned_admin = assigned_admin
    complaint.save()
    return _apply_complaint_transition(complaint, "ASSIGNED", admin_actor)


def resolve_complaint(complaint, admin_actor, resolution_type, resolution_notes, refund_amount=None):
    with transaction.atomic():
        complaint.resolution_type = resolution_type
        complaint.resolution_notes = resolution_notes

        if refund_amount and complaint.booking:
            refund = create_refund_request(
                booking=complaint.booking,
                customer=complaint.raised_by,
                amount=refund_amount,
                reason=f"Refund for complaint {complaint.complaint_number}"
            )
            complaint.refund_request = refund

        complaint.save()
        return _apply_complaint_transition(complaint, "RESOLVED", admin_actor, resolution_notes)


def close_complaint(complaint, admin_actor):
    return _apply_complaint_transition(complaint, "CLOSED", admin_actor)


def list_admin_complaints(admin_actor, filters=None, company=None):
    qs = Complaint.objects.select_related("booking", "raised_by", "assigned_admin")
    if company is not None:
        qs = qs.filter(booking__company=company)
    if filters:
        if filters.get("status"):
            qs = qs.filter(status=filters["status"].upper())
        if filters.get("priority"):
            qs = qs.filter(priority=filters["priority"].upper())
        if filters.get("category"):
            qs = qs.filter(category=filters["category"].upper())
    return list(qs.order_by("-created_at"))


# GT-D-02: multi-stop trips (extra pickups/drops beyond ServiceRequest's
# built-in address/drop_address pair). See TripStop's docstring for why
# this is additive rather than a replacement of those two fields.
LOGISTICS_STOP_CATEGORIES = {"goods_transport_truck", "goods_transport_two_wheeler", "goods_transport", "packers_movers"}


def set_trip_stops(booking, customer, stops):
    """
    Replaces the full ordered list of extra stops for a booking in one
    transaction (delete-then-recreate, never a partial update) -- so a
    client always PUTs the complete route rather than PATCHing individual
    stops, avoiding sequence-gap/duplicate bugs entirely.

    `stops` is a list of dicts: address (required), stop_type (optional,
    default WAYPOINT), contact_name, contact_phone, latitude, longitude,
    notes. Sequence is assigned from list order (1-based), not client-
    supplied, so the ordering a customer submits is always exactly what
    gets stored.
    """
    if booking.customer_id != customer.id and getattr(customer, "role", "").upper() != "ADMIN":
        raise PermissionError("You do not have permission to edit stops for this booking.")
    if booking.service_category not in LOGISTICS_STOP_CATEGORIES:
        raise ValueError("Multi-stop routing is only available for goods transport and packers & movers bookings.")
    if len(stops) > 20:
        raise ValueError("A single trip cannot have more than 20 stops.")
    for s in stops:
        if not (s.get("address") or "").strip():
            raise ValueError("Every stop requires an address.")

    with transaction.atomic():
        TripStop.objects.filter(booking=booking).delete()
        created = []
        for i, s in enumerate(stops, start=1):
            created.append(TripStop.objects.create(
                booking=booking,
                sequence=i,
                stop_type=(s.get("stop_type") or TripStop.StopType.WAYPOINT).upper(),
                address=s["address"].strip(),
                contact_name=(s.get("contact_name") or "").strip(),
                contact_phone=(s.get("contact_phone") or "").strip(),
                latitude=s.get("latitude"),
                longitude=s.get("longitude"),
                notes=(s.get("notes") or "").strip(),
            ))
    return created


def list_trip_stops(booking):
    return list(booking.trip_stops.all())
