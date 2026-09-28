"""
service_requests/services/estimation_service.py

Domain service for AC Inspection / Estimation booking creation, lifecycle, and cancellation.
Enforces transactional integrity, concurrency locking, and idempotency.
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from service_requests.models import ServiceRequest, Estimation, EstimationFee
from service_requests.services.outbox_service import OutboxService

logger = logging.getLogger("service_requests.estimation")

# Allowed AC Types and Capacities for backend validation
ALLOWED_AC_TYPES = {"SPLIT", "WINDOW", "CASSETTE", "TOWER", "OTHER"}
ALLOWED_AC_CAPACITIES = {"1_TON", "1.5_TON", "2_TON", "OTHER"}
DEFAULT_ESTIMATION_FEE = Decimal("199.00")


class EstimationStateConflictError(Exception):
    """Raised when an operation cannot be completed due to the current lifecycle state."""
    pass


class EstimationService:
    @staticmethod
    def get_configured_fee_amount() -> Decimal:
        """
        Retrieves the authoritative backend estimation fee from ACInspectionConfiguration.
        """
        try:
            from service_requests.models import ACInspectionConfiguration
            config = ACInspectionConfiguration.get_solo()
            if config and config.diagnostic_fee is not None and config.diagnostic_fee >= 0:
                return config.diagnostic_fee
        except Exception:
            pass

        from service_requests.models import Package
        pkg = Package.objects.filter(slug="ac-inspection", status="ACTIVE").first()
        if pkg and pkg.base_price and pkg.base_price > 0:
            return Decimal(str(pkg.base_price))
        return DEFAULT_ESTIMATION_FEE

    @classmethod
    def create_estimation_booking(
        cls,
        customer,
        ac_details: Dict[str, Any],
        booking_data: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        company=None,
    ) -> Tuple[ServiceRequest, bool]:
        """
        Atomically creates a ServiceRequest (job_type=ESTIMATION), linked Estimation,
        and EstimationFee in a single transaction with idempotency protection.
        """
        # 1. Server-side validation of AC parameters
        raw_ac_type = str(ac_details.get("ac_type") or ac_details.get("type") or "").strip().upper()
        if "WINDOW" in raw_ac_type:
            ac_type = "WINDOW"
        elif "SPLIT" in raw_ac_type:
            ac_type = "SPLIT"
        elif "CASSETTE" in raw_ac_type:
            ac_type = "CASSETTE"
        elif "TOWER" in raw_ac_type:
            ac_type = "TOWER"
        elif "OTHER" in raw_ac_type:
            ac_type = "OTHER"
        else:
            ac_type = raw_ac_type

        if ac_type not in ALLOWED_AC_TYPES:
            raise ValidationError({"ac_type": f"Invalid AC type '{raw_ac_type}'. Allowed: {', '.join(sorted(ALLOWED_AC_TYPES))}."})

        raw_cap = str(ac_details.get("ac_capacity") or ac_details.get("capacity") or "").strip().upper().replace(" ", "_")
        if raw_cap in ALLOWED_AC_CAPACITIES:
            ac_capacity = raw_cap
        else:
            ac_capacity = "1.5_TON"

        raw_qty = ac_details.get("ac_quantity")
        if raw_qty is None:
            raw_qty = ac_details.get("quantity")
        if raw_qty is None:
            raw_qty = 1

        try:
            ac_quantity = int(raw_qty)
        except (ValueError, TypeError):
            raise ValidationError({"ac_quantity": "AC quantity must be a valid integer."})

        if ac_quantity < 1:
            raise ValidationError({"ac_quantity": "Quantity must be at least 1 unit."})
        if ac_quantity > 50:
            raise ValidationError({"ac_quantity": "Quantity exceeds the maximum limit of 50 units per booking."})

        customer_symptom = str(ac_details.get("customer_symptom") or ac_details.get("symptom") or ac_details.get("problem") or "").strip()
        if not customer_symptom:
            raise ValidationError({"customer_symptom": "Please describe the AC issue or symptom."})

        ac_brand = str(ac_details.get("ac_brand") or ac_details.get("brand") or "Other").strip()
        customer_notes = str(ac_details.get("customer_notes") or ac_details.get("notes") or "").strip()

        # 2. Idempotency Check
        if idempotency_key and customer and customer.is_authenticated:
            existing = ServiceRequest.objects.filter(
                customer=customer,
                idempotency_key=idempotency_key
            ).select_related("estimation", "estimation__fee").first()
            if existing:
                logger.info(f"[Estimation] Idempotent hit: returning existing ServiceRequest {existing.request_id}")
                return existing, False

        fee_amount = cls.get_configured_fee_amount()

        # 3. Transactional atomic creation
        try:
            with transaction.atomic():
                sr = ServiceRequest(
                    company=company,
                    customer=customer if (customer and customer.is_authenticated) else None,
                    customer_name=booking_data.get("customer_name", ""),
                    phone=booking_data.get("phone", ""),
                    email=booking_data.get("email", ""),
                    service_category="hvac",
                    issue_title=f"AC Inspection & Estimation ({ac_brand} {ac_type} {ac_capacity.replace('_', ' ')})",
                    description=customer_symptom,
                    address=booking_data.get("address", ""),
                    latitude=booking_data.get("latitude"),
                    longitude=booking_data.get("longitude"),
                    preferred_date=booking_data.get("preferred_date"),
                    preferred_time=booking_data.get("preferred_time", ""),
                    job_type=ServiceRequest.JobType.ESTIMATION,
                    request_kind=str(booking_data.get("request_kind") or "ESTIMATION"),
                    catalog_service_id=str(booking_data.get("catalog_service_id") or booking_data.get("serviceId") or "ac-inspection"),
                    status=ServiceRequest.Status.REQUESTED,
                    payment_method=booking_data.get("payment_method", "COD"),
                    payment_status=ServiceRequest.PaymentStatus.PENDING,
                    total_amount=fee_amount,
                    idempotency_key=idempotency_key,
                )
                sr.save()

                estimation = Estimation.objects.create(
                    service_request=sr,
                    ac_type=ac_type,
                    ac_brand=ac_brand,
                    ac_capacity=ac_capacity,
                    ac_quantity=ac_quantity,
                    customer_symptom=customer_symptom,
                    customer_notes=customer_notes,
                    status=Estimation.Status.REQUESTED,
                )

                fee = EstimationFee.objects.create(
                    estimation=estimation,
                    amount=fee_amount,
                    currency="INR",
                    status=EstimationFee.Status.PENDING,
                )


                # Atomically create CustomerInspection and snapshot all active rate card items
                from service_requests.services.customer_inspection_service import CustomerInspectionService
                CustomerInspectionService.create_inspection_and_rate_snapshots(
                    service_request=sr,
                    quantity=ac_quantity,
                    inspection_name="AC Inspection & Diagnostic Visit",
                )

                # Record status event for analytics and audit
                from customer_analytics.models import BookingStatusEvent
                BookingStatusEvent.objects.create(
                    service_request=sr,
                    customer=sr.customer,
                    company=sr.company,
                    from_status="",
                    to_status=sr.status,
                    actor=customer if (customer and customer.is_authenticated) else None,
                    actor_persona=BookingStatusEvent.ActorPersona.CUSTOMER if (customer and customer.is_authenticated) else BookingStatusEvent.ActorPersona.SYSTEM,
                    reason_code="ESTIMATION_BOOKED",
                    reason_note=f"AC Estimation booked ({ac_quantity} unit(s) of {ac_brand} {ac_type}).",
                    occurred_at=timezone.now(),
                )

                # Record Outbox Event
                OutboxService.record_event(
                    aggregate_type="ServiceRequest",
                    aggregate_id=sr.request_id,
                    event_type="estimation.created",
                    payload={
                        "request_id": sr.request_id,
                        "booking_id": sr.id,
                        "job_type": sr.job_type,
                        "status": sr.status,
                        "estimation_id": estimation.id,
                        "ac_type": estimation.ac_type,
                        "ac_brand": estimation.ac_brand,
                        "ac_capacity": estimation.ac_capacity,
                        "ac_quantity": estimation.ac_quantity,
                        "fee_amount": float(fee.amount),
                        "fee_status": fee.status,
                    },
                    version=1,
                )

                return sr, True

        except IntegrityError as e:
            # Catch concurrent race condition on idempotency key
            if idempotency_key and customer and customer.is_authenticated:
                existing = ServiceRequest.objects.filter(
                    customer=customer,
                    idempotency_key=idempotency_key
                ).select_related("estimation", "estimation__fee").first()
                if existing:
                    return existing, False
            logger.error(f"[Estimation] IntegrityError during estimation creation: {e}")
            raise e

    @classmethod
    def cancel_estimation(cls, service_request: ServiceRequest, actor, reason: str = "Cancelled by customer") -> ServiceRequest:
        """
        Cancels an estimation booking with row-level locking and lifecycle validation.
        """
        with transaction.atomic():
            sr = ServiceRequest.objects.select_for_update().get(pk=service_request.pk)

            # Check cancellable statuses
            cancellable_statuses = {
                ServiceRequest.Status.DRAFT,
                ServiceRequest.Status.REQUESTED,
                ServiceRequest.Status.VENDOR_CONFIRMED,
                ServiceRequest.Status.TECHNICIAN_ASSIGNED,
                ServiceRequest.Status.NEW_REQUEST,
                ServiceRequest.Status.UNASSIGNED,
                ServiceRequest.Status.CONFIRMED,
                ServiceRequest.Status.ASSIGNED,
            }

            if sr.status not in cancellable_statuses:
                raise EstimationStateConflictError(
                    f"Booking #{sr.request_id} cannot be cancelled in status '{sr.status}'."
                )

            old_status = sr.status
            sr.status = ServiceRequest.Status.CANCELLED
            sr.cancelled_at = timezone.now()
            sr.cancellation_note = reason
            sr.cancelled_by = actor if (actor and actor.is_authenticated) else None
            sr.save(update_fields=["status", "cancelled_at", "cancellation_note", "cancelled_by", "updated_at"])

            if hasattr(sr, "estimation"):
                est = sr.estimation
                est.status = Estimation.Status.CANCELLED
                est.save(update_fields=["status", "updated_at"])

            from customer_analytics.models import BookingStatusEvent
            BookingStatusEvent.objects.create(
                service_request=sr,
                customer=sr.customer,
                company=sr.company,
                from_status=old_status,
                to_status=sr.status,
                actor=actor if (actor and actor.is_authenticated) else None,
                actor_persona=BookingStatusEvent.ActorPersona.CUSTOMER,
                reason_code="CUSTOMER_CANCELLED",
                reason_note=reason,
                occurred_at=timezone.now(),
            )

            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="estimation.cancelled",
                payload={
                    "request_id": sr.request_id,
                    "status": sr.status,
                    "reason": reason,
                },
                version=2,
            )

            return sr
