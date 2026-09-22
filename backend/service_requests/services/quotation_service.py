"""
service_requests/services/quotation_service.py

Domain service for Estimation Quotation generation, immutable versioning,
financial calculations using Decimal, and atomic customer approval/rejection.
"""
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from service_requests.models import (
    ServiceRequest,
    Estimation,
    EstimationQuotation,
    EstimationQuotationItem,
    Service,
)
from service_requests.services.estimation_service import EstimationStateConflictError
from service_requests.services.outbox_service import OutboxService

logger = logging.getLogger("service_requests.quotation")


class QuotationService:
    @staticmethod
    def _round_currency(val: Decimal) -> Decimal:
        return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    def calculate_totals(cls, items_data: List[Dict[str, Any]]) -> Dict[str, Decimal]:
        """
        Authoritatively calculates commercial totals from line items using Decimal arithmetic.
        """
        if not items_data:
            raise ValidationError({"items": "At least one quotation item is required."})

        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")
        discount_total = Decimal("0.00")

        for idx, item in enumerate(items_data):
            try:
                qty = Decimal(str(item.get("quantity", 1)))
            except (ValueError, TypeError):
                raise ValidationError({f"items[{idx}].quantity": "Invalid quantity."})
            if qty <= 0:
                raise ValidationError({f"items[{idx}].quantity": "Quantity must be greater than zero."})

            try:
                price = Decimal(str(item.get("unit_price", 0)))
            except (ValueError, TypeError):
                raise ValidationError({f"items[{idx}].unit_price": "Invalid unit price."})
            if price < 0:
                raise ValidationError({f"items[{idx}].unit_price": "Price cannot be negative."})

            tax_rate = Decimal(str(item.get("tax_rate", 0)))
            tax_amount = Decimal(str(item.get("tax_amount", 0)))
            if tax_amount <= 0 and tax_rate > 0:
                tax_amount = cls._round_currency((price * qty) * (tax_rate / Decimal("100.00")))

            discount_amount = Decimal(str(item.get("discount_amount", 0)))
            if discount_amount < 0:
                raise ValidationError({f"items[{idx}].discount_amount": "Discount cannot be negative."})

            base_line = cls._round_currency(price * qty)
            line_total = cls._round_currency(base_line + tax_amount - discount_amount)
            if line_total < 0:
                line_total = Decimal("0.00")

            subtotal += base_line
            tax_total += tax_amount
            discount_total += discount_amount

        grand_total = cls._round_currency(subtotal + tax_total - discount_total)
        if grand_total < 0:
            grand_total = Decimal("0.00")

        return {
            "subtotal": cls._round_currency(subtotal),
            "tax_amount": cls._round_currency(tax_total),
            "discount_amount": cls._round_currency(discount_total),
            "total_amount": grand_total,
        }

    @classmethod
    def create_quotation(
        cls,
        estimation: Estimation,
        items_data: List[Dict[str, Any]],
        notes: str = "",
        valid_days: int = 7,
        vendor_id: str = "",
        technician_id: str = "",
    ) -> EstimationQuotation:
        """
        Creates a concurrency-safe, version-incremented Quotation for an Estimation.
        """
        totals = cls.calculate_totals(items_data)

        with transaction.atomic():
            # Concurrency lock on estimation
            est = Estimation.objects.select_for_update().get(pk=estimation.pk)
            sr = est.service_request

            latest_version = (
                EstimationQuotation.objects.filter(estimation=est)
                .select_for_update()
                .values_list("version", flat=True)
                .order_by("-version")
                .first()
                or 0
            )
            next_version = latest_version + 1
            quote_ref = f"QT-{sr.request_id}-V{next_version}"

            # Supersede previous active quotes
            EstimationQuotation.objects.filter(
                estimation=est,
                status__in=[EstimationQuotation.Status.DRAFT, EstimationQuotation.Status.SENT]
            ).update(status=EstimationQuotation.Status.SUPERSEDED)

            valid_until = timezone.localdate() + timezone.timedelta(days=valid_days)

            quotation = EstimationQuotation.objects.create(
                estimation=est,
                version=next_version,
                quote_ref=quote_ref,
                status=EstimationQuotation.Status.SENT,
                vendor_id=vendor_id or sr.vendor_id,
                technician_id=technician_id or getattr(getattr(sr, "technician", None), "id", "") or getattr(sr, "technician_id", "") or "",
                subtotal=totals["subtotal"],
                tax_amount=totals["tax_amount"],
                discount_amount=totals["discount_amount"],
                total_amount=totals["total_amount"],
                currency="INR",
                notes=notes,
                valid_until=valid_until,
            )

            # Snapshot quotation items
            items_to_create = []
            for idx, item in enumerate(items_data):
                qty = Decimal(str(item.get("quantity", 1)))
                price = Decimal(str(item.get("unit_price", 0)))
                tax_rate = Decimal(str(item.get("tax_rate", 0)))
                tax_amount = Decimal(str(item.get("tax_amount", 0)))
                if tax_amount <= 0 and tax_rate > 0:
                    tax_amount = cls._round_currency((price * qty) * (tax_rate / Decimal("100.00")))
                discount_amount = Decimal(str(item.get("discount_amount", 0)))
                line_total = cls._round_currency((price * qty) + tax_amount - discount_amount)
                if line_total < 0:
                    line_total = Decimal("0.00")

                service_instance = None
                service_id = item.get("service") or item.get("service_id")
                if service_id:
                    if isinstance(service_id, Service):
                        service_instance = service_id
                    elif str(service_id).isdigit():
                        service_instance = Service.objects.filter(pk=int(service_id)).first()


                items_to_create.append(
                    EstimationQuotationItem(
                        quotation=quotation,
                        service=service_instance,
                        catalog_service_id=str(service_id or ""),
                        service_name=str(item.get("service_name") or item.get("name") or "AC Repair / Service"),
                        description=str(item.get("description") or ""),
                        quantity=qty,
                        unit=str(item.get("unit") or "job"),
                        unit_price=cls._round_currency(price),
                        tax_rate=cls._round_currency(tax_rate),
                        tax_amount=cls._round_currency(tax_amount),
                        discount_amount=cls._round_currency(discount_amount),
                        line_total=line_total,
                        sort_order=idx,
                    )
                )

            EstimationQuotationItem.objects.bulk_create(items_to_create)

            # Update lifecycle statuses
            est.status = Estimation.Status.QUOTATION_SENT
            est.save(update_fields=["status", "updated_at"])

            sr.status = ServiceRequest.Status.QUOTATION_SENT
            sr.save(update_fields=["status", "updated_at"])

            # Record status history
            from customer_analytics.models import BookingStatusEvent
            BookingStatusEvent.objects.create(
                service_request=sr,
                customer=sr.customer,
                company=sr.company,
                from_status=ServiceRequest.Status.INSPECTION_COMPLETED,
                to_status=ServiceRequest.Status.QUOTATION_SENT,
                actor=None,
                actor_persona=BookingStatusEvent.ActorPersona.SYSTEM,
                reason_code="QUOTATION_GENERATED",
                reason_note=f"Quotation {quote_ref} generated for ₹{quotation.total_amount}.",
                occurred_at=timezone.now(),
            )

            # Record outbox event
            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="quotation.sent",
                payload={
                    "request_id": sr.request_id,
                    "quotation_id": quotation.id,
                    "quote_ref": quotation.quote_ref,
                    "version": quotation.version,
                    "total_amount": float(quotation.total_amount),
                    "subtotal": float(quotation.subtotal),
                    "tax_amount": float(quotation.tax_amount),
                    "items_count": len(items_to_create),
                    "valid_until": str(quotation.valid_until),
                },
                version=quotation.version,
            )

            return quotation

    @classmethod
    def approve_quotation(
        cls,
        service_request_id: int,
        quotation_id: Optional[int],
        customer,
    ) -> ServiceRequest:
        """
        Atomically approves a quotation and transitions job_type to CHANGE_REQUEST
        on the exact same ServiceRequest without creating a second booking.
        """
        with transaction.atomic():
            sr = (
                ServiceRequest.objects.select_for_update()
                .select_related("estimation")
                .filter(pk=service_request_id)
                .first()
            )
            if not sr:
                raise ValidationError({"detail": "ServiceRequest not found."})

            # Customer ownership validation
            if customer and customer.is_authenticated:
                if sr.customer_id and sr.customer_id != customer.id:
                    raise EstimationStateConflictError("You are not authorized to approve this quotation.")

            if not hasattr(sr, "estimation"):
                raise EstimationStateConflictError("No estimation found for this booking.")

            est = sr.estimation

            # Lock quotation
            q_query = EstimationQuotation.objects.select_for_update().filter(estimation=est)
            if quotation_id:
                quote = q_query.filter(pk=quotation_id).first()
            else:
                quote = q_query.order_by("-version").first()

            if not quote:
                raise ValidationError({"detail": "Quotation not found."})

            if quote.status == EstimationQuotation.Status.APPROVED:
                raise EstimationStateConflictError("This quotation has already been approved.")

            if quote.status != EstimationQuotation.Status.SENT:
                raise EstimationStateConflictError(f"Quotation cannot be approved in '{quote.status}' status.")

            # Mark quotation APPROVED
            quote.status = EstimationQuotation.Status.APPROVED
            quote.customer_approved_at = timezone.now()
            quote.save(update_fields=["status", "customer_approved_at", "updated_at"])

            # Mark estimation CUSTOMER_APPROVED / CONVERTED_TO_SERVICE
            est.status = Estimation.Status.CUSTOMER_APPROVED
            est.save(update_fields=["status", "updated_at"])

            # ── CONVERT TO CHANGE_REQUEST ON THE SAME SERVICEREQUEST ─────────────
            old_job_type = sr.job_type
            old_status = sr.status

            sr.job_type = ServiceRequest.JobType.CHANGE_REQUEST
            sr.request_kind = "quoted_work"
            sr.status = ServiceRequest.Status.CUSTOMER_APPROVED
            sr.total_amount = quote.total_amount
            # Preserve vendor, technician, schedule, address, customer
            sr.save(update_fields=["job_type", "request_kind", "status", "total_amount", "updated_at"])

            # Record history
            from customer_analytics.models import BookingStatusEvent
            BookingStatusEvent.objects.create(
                service_request=sr,
                customer=sr.customer,
                company=sr.company,
                from_status=old_status,
                to_status=sr.status,
                actor=customer if (customer and customer.is_authenticated) else None,
                actor_persona=BookingStatusEvent.ActorPersona.CUSTOMER,
                reason_code="QUOTATION_APPROVED",
                reason_note=f"Customer approved quotation {quote.quote_ref} (₹{quote.total_amount}). Converted to CHANGE_REQUEST.",
                occurred_at=timezone.now(),
            )

            # Record Outbox Event
            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="quotation.approved",
                payload={
                    "request_id": sr.request_id,
                    "booking_id": sr.id,
                    "job_type": sr.job_type,
                    "status": sr.status,
                    "quotation_id": quote.id,
                    "quote_ref": quote.quote_ref,
                    "total_amount": float(quote.total_amount),
                    "approved_at": quote.customer_approved_at.isoformat(),
                },
                version=quote.version + 10,
            )

            logger.info(
                f"[Quotation] Approved {quote.quote_ref} for SR #{sr.request_id}. "
                f"Preserved ID. Converted {old_job_type} -> {sr.job_type}."
            )
            return sr

    @classmethod
    def reject_quotation(
        cls,
        service_request_id: int,
        quotation_id: Optional[int],
        customer,
        reason_code: str = "",
        reason_note: str = "",
    ) -> ServiceRequest:
        """
        Customer rejects quotation. Closes estimation, leaves job_type as ESTIMATION,
        and does not create a new booking.
        """
        with transaction.atomic():
            sr = (
                ServiceRequest.objects.select_for_update()
                .select_related("estimation")
                .filter(pk=service_request_id)
                .first()
            )
            if not sr:
                raise ValidationError({"detail": "ServiceRequest not found."})

            if customer and customer.is_authenticated:
                if sr.customer_id and sr.customer_id != customer.id:
                    raise EstimationStateConflictError("You are not authorized to reject this quotation.")

            if not hasattr(sr, "estimation"):
                raise EstimationStateConflictError("No estimation found for this booking.")

            est = sr.estimation

            q_query = EstimationQuotation.objects.select_for_update().filter(estimation=est)
            if quotation_id:
                quote = q_query.filter(pk=quotation_id).first()
            else:
                quote = q_query.order_by("-version").first()

            if not quote:
                raise ValidationError({"detail": "Quotation not found."})

            if quote.status == EstimationQuotation.Status.APPROVED:
                raise EstimationStateConflictError("Cannot reject a quotation that has already been approved.")

            if quote.status == EstimationQuotation.Status.REJECTED:
                raise EstimationStateConflictError("This quotation has already been rejected.")

            if quote.status != EstimationQuotation.Status.SENT:
                raise EstimationStateConflictError(f"Quotation cannot be rejected in '{quote.status}' status.")

            quote.status = EstimationQuotation.Status.REJECTED
            quote.customer_rejected_at = timezone.now()
            quote.rejection_reason = reason_code
            quote.rejection_note = reason_note
            quote.save(update_fields=["status", "customer_rejected_at", "rejection_reason", "rejection_note", "updated_at"])

            est.status = Estimation.Status.CUSTOMER_REJECTED
            est.save(update_fields=["status", "updated_at"])

            old_status = sr.status
            sr.status = ServiceRequest.Status.CUSTOMER_REJECTED
            # Remains job_type = ESTIMATION
            sr.save(update_fields=["status", "updated_at"])

            from customer_analytics.models import BookingStatusEvent
            BookingStatusEvent.objects.create(
                service_request=sr,
                customer=sr.customer,
                company=sr.company,
                from_status=old_status,
                to_status=sr.status,
                actor=customer if (customer and customer.is_authenticated) else None,
                actor_persona=BookingStatusEvent.ActorPersona.CUSTOMER,
                reason_code="QUOTATION_REJECTED",
                reason_note=f"Customer rejected quotation {quote.quote_ref}: {reason_code} - {reason_note}",
                occurred_at=timezone.now(),
            )

            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="quotation.rejected",
                payload={
                    "request_id": sr.request_id,
                    "quotation_id": quote.id,
                    "quote_ref": quote.quote_ref,
                    "reason_code": reason_code,
                    "reason_note": reason_note,
                },
                version=quote.version + 10,
            )

            return sr
