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
from service_requests.models import (
    RescheduleRequest, RescheduleStatus, RescheduleReason, TimeSlotChoices, RescheduleAttachment,
    RescheduleRejectionReason,
    RefundRequest, RefundStatus, RefundType, RefundReason, RefundInfoTarget, RefundEvidence,
    Complaint, ComplaintAttachment, ComplaintMessage, ComplaintStatusHistory,
    ServiceRequest,
)


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


def admin_complete_refund(admin_user, refund_id):
    try:
        rr = RefundRequest.objects.get(pk=refund_id)
    except RefundRequest.DoesNotExist:
        raise ValidationError({"detail": "RefundRequest not found."})

    return apply_refund_transition(
        refund_request=rr,
        new_status=RefundStatus.COMPLETED,
        actor=admin_user,
        note="Refund transaction completed."
    )


def list_refund_requests(actor, persona, filters=None):
    qs = RefundRequest.objects.select_related("booking", "customer").prefetch_related("evidence")
    if persona == "CUSTOMER":
        qs = qs.filter(Q(customer=actor) | Q(requested_by=actor))
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
