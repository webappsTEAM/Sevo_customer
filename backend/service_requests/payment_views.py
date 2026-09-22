"""
service_requests/payment_views.py

Payment-specific API views:
  - Payment initiation / verification (simulates gateway / Razorpay flow)
  - Admin payment status overrides
  - Customer & Admin Invoice PDF generation
"""
import hashlib
import hmac
import logging
import uuid
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import is_admin_role
from .models import Payment, ServiceRequest
from .serializers import ServiceRequestDetailSerializer
from .state_machine import apply_transition

logger = logging.getLogger(__name__)


def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400):
    return Response({"success": False, "message": message}, status=status_code)


def _verify_booking_ownership(request, sr):
    """
    Same ownership rule CustomerBookingCancelView already uses: a matching
    tracking_token, an authenticated owner (by id, email, or phone), or a
    phone number matching the booking's own phone. Guest checkout still
    works without login as long as the caller can prove they know the
    booking's tracking token or phone number.
    """
    provided_token = (
        request.data.get("token")
        or request.query_params.get("token")
        or request.data.get("tracking_token")
    )
    # The expiry rule has to apply here too. EC-08 gave tracking tokens a
    # 180-day life because a link that has been forwarded, screenshotted or
    # left in an old SMS should stop being a bearer credential -- but that
    # check lived only on the tracking endpoints. This one accepts the same
    # token to authorise a PAYMENT, so without it an expired link was still
    # good enough to start and confirm an order on someone's booking: a
    # weaker rule guarding the more sensitive action.
    from .views import _tracking_token_is_expired

    token_matches = bool(
        provided_token and sr.tracking_token and
        str(sr.tracking_token).lower() == str(provided_token).strip().lower() and
        not _tracking_token_is_expired(sr)
    )
    if request.user and request.user.is_authenticated:
        is_owner = bool(
            (sr.customer_id and sr.customer_id == request.user.id) or
            (getattr(request.user, "email", None) and sr.email and
             request.user.email.strip().lower() == sr.email.strip().lower()) or
            (getattr(request.user, "phone", None) and sr.phone and
             request.user.phone.strip()[-10:] == sr.phone.strip()[-10:])
        )
        if is_owner or token_matches:
            return True
        try:
            from accounts.permissions import is_super_admin, can
            if is_super_admin(request.user) or can(request.user, "bookings", "cancel"):
                return True
        except Exception:
            pass
        return False
    provided_phone = (request.data.get("phone") or "").strip()
    phone_matches = bool(provided_phone and sr.phone and provided_phone[-10:] == sr.phone.strip()[-10:])
    return token_matches or phone_matches


# ─── Payment Initiation & Verification ────────────────────────────────────────

class PaymentInitiateView(APIView):
    """
    POST /api/payment/initiate/
    Creates a payment order for the given booking.

    Fixes HS-C-01 (part 1 of 2, see PaymentVerifyView for part 2): the order
    is now persisted server-side as a Payment row, so PaymentVerifyView can
    check that the order_id it receives actually belongs to this booking
    instead of trusting anything the client sends. Ownership of the booking
    is also checked before an order is issued.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "payment"

    def post(self, request):
        booking_id = request.data.get("booking_id")
        if not booking_id:
            return _error("booking_id is required.")

        try:
            sr = ServiceRequest.objects.get(pk=booking_id)
        except (ServiceRequest.DoesNotExist, ValueError, TypeError):
            return _error("Booking not found.", 404)

        if not _verify_booking_ownership(request, sr):
            return _error("You are not authorized to pay for this booking.", 403)

        if sr.payment_method != ServiceRequest.PaymentMethod.ONLINE:
            return _error("This booking does not require online payment.")

        if sr.payment_status == ServiceRequest.PaymentStatus.PAID:
            return _error("This booking is already paid.")

        # How much to charge for THIS order.
        #
        # This used to be sr.total_amount unconditionally, which contradicted
        # every other part of the system for quoted painting/masonry work: the
        # quote the customer accepted names an advance (PaintingQuote.
        # advance_amount, set to 50% of the grand total when the quote is
        # raised), state_machine.py refuses to start the work until that
        # advance is recorded, and the booking page shows the advance as what
        # is due. Only this endpoint asked for the whole grand total up front
        # -- so a customer who accepted a Rs.20,000 quote with a Rs.10,000
        # advance was presented with a Rs.20,000 order.
        #
        # The frontend was papering over it by computing `grandTotal * 0.5`
        # itself (BookingPage.jsx), which means the amount actually charged
        # was being decided client-side. The amount charged has to come from
        # the server.
        amount_due, due_error = self._amount_due(sr)
        if due_error:
            return _error(due_error)

        gateway_configured = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)

        if gateway_configured:
            order_id, gateway_error = self._create_razorpay_order(sr, amount_due)
            if gateway_error:
                return _error(gateway_error, 502)
        else:
            order_id = f"order_sandbox_{uuid.uuid4().hex[:16]}"

        Payment.objects.create(
            customer=sr.customer,
            service_request=sr,
            razorpay_order_id=order_id,
            amount=amount_due,
            currency="INR",
            status=ServiceRequest.PaymentStatus.PENDING,
            gateway="razorpay" if gateway_configured else "sandbox",
        )

        return _success(
            data={
                "order_id": order_id,
                "amount": float(amount_due),
                "booking_total": float(sr.total_amount),
                "currency": "INR",
                "booking_id": sr.id,
                "request_id": sr.request_id,
                "customer_name": sr.customer_name,
                "customer_email": sr.email or "",
                "customer_phone": sr.phone or "",
                "description": f"Payment for {sr.issue_title}",
                "key_id": settings.RAZORPAY_KEY_ID if gateway_configured else "",
                "sandbox": not gateway_configured,
            },
            message="Payment order created.",
        )

    def _amount_due(self, sr):
        """
        (amount, error). What this order should charge, decided here rather
        than accepted from the client.

        For quoted work with an advance: the advance first, then whatever is
        left. For everything else: the remaining balance on the booking. In
        both cases already-recorded payments are subtracted, so a second
        order after a part payment asks for the remainder rather than the
        whole amount again.

        The quote lookup deliberately mirrors state_machine.py's advance
        check (parent booking first, then the booking itself, APPROVED only)
        so the amount charged and the gate that lets work start can never
        disagree about what the advance is.
        """
        from .models import PaintingQuote

        total = Decimal(str(sr.total_amount or 0))
        if total <= 0:
            return None, "This booking has no amount to pay."

        paid = Payment.objects.filter(
            service_request=sr,
            status__in=[
                ServiceRequest.PaymentStatus.PAID,
                ServiceRequest.PaymentStatus.COLLECTED,
            ],
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        paid = Decimal(str(paid))

        quote = None
        if sr.parent_request_id:
            quote = PaintingQuote.objects.filter(
                service_request=sr.parent_request, status=PaintingQuote.Status.APPROVED
            ).first()
        if quote is None:
            quote = PaintingQuote.objects.filter(
                service_request=sr, status=PaintingQuote.Status.APPROVED
            ).first()

        if quote and quote.advance_amount and Decimal(str(quote.advance_amount)) > 0:
            advance = Decimal(str(quote.advance_amount))
            if paid < advance:
                due = advance - paid
            else:
                due = total - paid
        else:
            due = total - paid

        if due <= 0:
            return None, "This booking is already fully paid."
        # Never ask for more than the booking is worth, whatever the quote says.
        return min(due, total), None

    def _create_razorpay_order(self, sr, amount):
        """
        Creates a real order via the Razorpay Orders API. Only reached when
        RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are configured (i.e. once the
        business supplies real gateway credentials). Returns
        (order_id, error_message) — error_message is None on success.
        """
        try:
            import razorpay
        except ImportError:
            logger.error("razorpay package not installed but RAZORPAY_KEY_ID/SECRET are configured.")
            return None, "Payment gateway is misconfigured. Please contact support."

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order = client.order.create({
                "amount": int(float(amount) * 100),  # paise
                "currency": "INR",
                "receipt": sr.request_id,
                "notes": {"booking_id": str(sr.id), "request_id": sr.request_id},
            })
            return order["id"], None
        except Exception as e:
            logger.error(f"Razorpay order creation failed for booking {sr.id}: {e}")
            return None, "Could not start payment. Please try again."


class PaymentVerifyView(APIView):
    """
    POST /api/payment/verify/
    Verifies payment completion.
    On success: updates booking status to Confirmed, payment_status to Paid.

    Fixes HS-C-01: this endpoint used to trust a client-supplied
    "mock_success" flag that DEFAULTED TO TRUE, with no signature check, no
    amount check, no ownership check, and no idempotency check — a single
    unauthenticated POST with any booking_id could mark that booking paid.
    Now:
      - order_id must match a Payment row this app itself issued via
        PaymentInitiateView (an order_id can no longer be invented client-side);
      - the requester must own the booking (tracking token, phone match, or
        authenticated owner — the same rule CustomerBookingCancelView uses);
      - when a live gateway is configured, the Razorpay HMAC-SHA256 signature
        is verified server-side before anything is marked paid;
      - the status change runs through apply_transition() instead of writing
        fields directly, so the state machine's own rules still apply;
      - a Payment row can only be consumed once (idempotent on repeat calls).
    When no gateway is configured, this now REFUSES to mark bookings paid
    (returns 503) unless PAYMENT_SANDBOX_MODE is explicitly enabled for local
    development — it no longer defaults to "success".
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "payment"

    def post(self, request):
        booking_id = request.data.get("booking_id")
        order_id   = request.data.get("order_id")
        payment_id = request.data.get("payment_id")
        signature  = request.data.get("signature") or request.data.get("razorpay_signature")

        if not booking_id or not order_id:
            return _error("booking_id and order_id are required.")

        try:
            sr = ServiceRequest.objects.get(pk=booking_id)
        except (ServiceRequest.DoesNotExist, ValueError, TypeError):
            return _error("Booking not found.", 404)

        if not _verify_booking_ownership(request, sr):
            return _error("You are not authorized to verify payment for this booking.", 403)

        payment = Payment.objects.filter(
            service_request=sr, razorpay_order_id=order_id
        ).order_by("-created_at").first()
        if not payment:
            logger.warning(f"Payment verify attempted for booking {sr.id} with unknown order_id={order_id!r}.")
            return _error("Unknown payment order for this booking.", 404)

        if payment.status == ServiceRequest.PaymentStatus.PAID:
            # Already verified earlier — idempotent success, don't re-run the transition.
            return _success(
                data={
                    "request_id":     sr.request_id,
                    "booking_status": sr.status,
                    "payment_status": sr.payment_status,
                    "transaction_id": sr.transaction_id,
                    "invoice_id":     sr.invoice_id,
                },
                message="Payment already confirmed.",
            )

        gateway_configured = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)

        if gateway_configured:
            if not (payment_id and signature):
                return _error("payment_id and signature are required.")
            expected_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
                f"{order_id}|{payment_id}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected_signature, str(signature)):
                payment.status = ServiceRequest.PaymentStatus.FAILED
                payment.error_code = "signature_mismatch"
                payment.save(update_fields=["status", "error_code", "updated_at"])
                logger.warning(f"Payment signature mismatch for booking {sr.id}, order {order_id}.")
                return _error("Payment verification failed.", 400)
        elif not settings.PAYMENT_SANDBOX_MODE:
            return _error(
                "Online payment is not available right now. Please choose cash on service or contact support.",
                503,
            )
        # else: PAYMENT_SANDBOX_MODE is on (local/dev only) — proceed without a
        # real signature so the flow can be exercised without live credentials.

        payment.razorpay_payment_id = payment_id or f"SANDBOX_{uuid.uuid4().hex[:12].upper()}"
        payment.razorpay_signature = signature or ""
        payment.status = ServiceRequest.PaymentStatus.PAID
        payment.save(update_fields=["razorpay_payment_id", "razorpay_signature", "status", "updated_at"])

        sr.transaction_id = payment.razorpay_payment_id
        sr.payment_gateway = payment.gateway
        if not sr.invoice_id:
            sr.invoice_id = f"INV-{sr.request_id}-{uuid.uuid4().hex[:6].upper()}"

        try:
            apply_transition(
                sr, ServiceRequest.Status.CONFIRMED, ServiceRequest.PaymentStatus.PAID,
                actor=request.user if request.user.is_authenticated else None,
            )
            sr.save(update_fields=["status", "payment_status", "transaction_id", "payment_gateway", "invoice_id", "updated_at"])
        except ValidationError as e:
            logger.error(f"Payment captured for booking {sr.id} but status transition to CONFIRMED failed: {e}")
            sr.payment_status = ServiceRequest.PaymentStatus.PAID
            sr.save(update_fields=["transaction_id", "payment_gateway", "invoice_id", "payment_status", "updated_at"])

            if sr.status == ServiceRequest.Status.CANCELLED:
                try:
                    import service_requests.services as sr_services
                    from service_requests.models import RefundReason
                    sr_services.create_refund_request(
                        booking=sr,
                        customer=sr.customer,
                        amount=sr.total_amount,
                        reason=RefundReason.OTHER,
                        additional_notes="Auto-created: Payment succeeded on a previously cancelled booking.",
                    )
                    logger.info(f"Auto-created refund request for late payment on cancelled booking {sr.id}")
                except Exception as refund_err:
                    logger.warning(f"Could not auto-create refund request for late payment on cancelled booking {sr.id}: {refund_err}")
            return _success(
                data={
                    "request_id":     sr.request_id,
                    "booking_status": sr.status,
                    "payment_status": sr.payment_status,
                    "transaction_id": sr.transaction_id,
                    "invoice_id":     sr.invoice_id,
                },
                message="Payment confirmed. Your booking status is being updated — please contact support if it does not update within a few minutes.",
            )

        return _success(
            data={
                "request_id":     sr.request_id,
                "booking_status": sr.status,
                "payment_status": sr.payment_status,
                "transaction_id": sr.transaction_id,
                "invoice_id":     sr.invoice_id,
            },
            message="Payment confirmed! Your booking is active.",
        )


# ─── Admin Payment Management ─────────────────────────────────────────────────

class AdminPaymentUpdateView(APIView):
    """
    PATCH /api/admin/service-requests/<id>/payment/
    Admin manually overrides payment status (e.g. confirm COD cash collected).
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if not hasattr(request.user, 'role') or request.user.role not in ('admin', 'manager', 'superadmin'):
            return _error("Admin access required.", 403)

        try:
            sr = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        new_payment_status = request.data.get("payment_status")
        valid = [c[0] for c in ServiceRequest.PaymentStatus.choices]
        if new_payment_status not in valid:
            return _error(f"Invalid payment_status. Valid: {valid}")

        sr.payment_status = new_payment_status
        if new_payment_status == ServiceRequest.PaymentStatus.PAID:
            sr.payment_collected_at = timezone.now()
            sr.payment_collected_by_name = request.data.get("collected_by_name") or request.user.get_full_name() or request.user.username
            sr.collection_method = request.data.get("collection_method") or "Cash"
            if not sr.invoice_id:
                sr.invoice_id = f"INV-{sr.request_id}-{uuid.uuid4().hex[:6].upper()}"
            sr.save(update_fields=["payment_status", "payment_collected_at", "payment_collected_by_name", "collection_method", "invoice_id", "updated_at"])
        else:
            sr.save(update_fields=["payment_status", "updated_at"])

        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message=f"Payment status updated to {sr.payment_status}.",
        )


# ─── Invoice PDF Generation ───────────────────────────────────────────────────

class InvoiceDownloadView(APIView):
    """
    GET /api/booking/<id>/invoice/ or GET /api/settings/invoices/download/?request_id=<id>
    Generate and return a PDF invoice for a service booking request.

    Fixes EC-09: this used to be permissions.AllowAny with no ownership check
    at all, and booking IDs are sequential — anyone could enumerate them and
    download every customer's invoice PDF (name, phone, email, home address,
    transaction ID). Now requires the same ownership proof used elsewhere in
    this app (tracking token, phone match, or authenticated owner), or admin
    staff.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "invoice_download"

    def get(self, request, pk=None):
        req_id = request.query_params.get("request_id") or request.query_params.get("id") or pk
        if not req_id:
            return _error("Booking ID or request_id parameter is required.", 400)

        sr = None
        if isinstance(req_id, int) or (isinstance(req_id, str) and req_id.isdigit()):
            sr = ServiceRequest.objects.filter(pk=int(req_id)).first()
        if not sr:
            sr = ServiceRequest.objects.filter(request_id__iexact=str(req_id)).first()

        if not sr:
            return _error(f"Booking with ID '{req_id}' not found.", 404)

        is_staff = bool(request.user and request.user.is_authenticated and is_admin_role(request.user))
        if not is_staff and not _verify_booking_ownership(request, sr):
            return _error("You are not authorized to view this invoice.", 403)

        if str(sr.status).lower() in ("cancelled", "rejected"):
            return _error("Invoice is not available for cancelled bookings.", 400)

        try:
            pdf_bytes = self._generate_invoice_pdf(sr)
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            filename = f"Invoice-{sr.invoice_id or sr.request_id}.pdf"
            response["Content-Disposition"] = f'inline; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Invoice generation failed: {e}")
            return _error("Failed to generate invoice. Please try again.")

    def _generate_invoice_pdf(self, sr):
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.colors import HexColor, black, white
        from io import BytesIO

        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        W, H = A4

        # Header
        c.setFillColor(HexColor("#4F46E5"))
        c.rect(0, H - 80, W, 80, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(30, H - 45, "Sevo")
        c.setFont("Helvetica", 11)
        c.drawString(30, H - 62, "Professional Home & Business Services")
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(W - 30, H - 45, "INVOICE")
        c.setFont("Helvetica", 10)
        c.drawRightString(W - 30, H - 62, f"#{sr.invoice_id or sr.request_id}")

        # Meta
        y = H - 110
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(30, y, "Booking Reference:")
        c.setFont("Helvetica", 10)
        c.drawString(180, y, sr.request_id)

        y -= 18
        c.setFont("Helvetica-Bold", 10)
        c.drawString(30, y, "Date:")
        c.setFont("Helvetica", 10)
        c.drawString(180, y, sr.created_at.strftime("%d %B %Y") if sr.created_at else "-")

        if sr.payment_collected_at:
            y -= 18
            c.setFont("Helvetica-Bold", 10)
            c.drawString(30, y, "Payment Date:")
            c.setFont("Helvetica", 10)
            c.drawString(180, y, sr.payment_collected_at.strftime("%d %B %Y %H:%M"))

        if sr.transaction_id:
            y -= 18
            c.setFont("Helvetica-Bold", 10)
            c.drawString(30, y, "Transaction ID:")
            c.setFont("Helvetica", 10)
            c.drawString(180, y, sr.transaction_id)

        # Billed To
        y -= 30
        c.setFillColor(HexColor("#F8FAFC"))
        c.rect(25, y - 10, W - 50, 70, fill=1, stroke=0)
        c.setFillColor(HexColor("#4F46E5"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(35, y + 48, "BILLED TO")
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(35, y + 30, sr.customer_name)
        c.setFont("Helvetica", 10)
        c.drawString(35, y + 14, sr.phone)
        if sr.email:
            c.drawString(35, y - 2, sr.email)
        c.setFont("Helvetica", 9)
        addr = sr.address[:80] + "..." if len(sr.address) > 80 else sr.address
        c.drawString(35, y - 18, addr)

        # Line items
        y -= 50
        c.setFillColor(HexColor("#4F46E5"))
        c.rect(25, y, W - 50, 24, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(35, y + 7, "Service & Additional Scope")
        c.drawString(320, y + 7, "Qty")
        c.drawString(370, y + 7, "Rate")
        c.drawRightString(W - 35, y + 7, "Amount")

        y -= 5
        c.setFillColor(black)
        cart = sr.cart_data or []
        if isinstance(cart, str):
            import json
            try:
                cart = json.loads(cart)
            except Exception:
                cart = []

        base_total = 0.0
        if cart:
            for i, item in enumerate(cart):
                y -= 22
                bg = HexColor("#F8FAFC") if i % 2 == 0 else white
                c.setFillColor(bg)
                c.rect(25, y - 4, W - 50, 22, fill=1, stroke=0)
                c.setFillColor(black)
                c.setFont("Helvetica", 10)
                name = str(item.get("name", "Service"))[:40]
                c.drawString(35, y + 4, name)
                qty = item.get("quantity", 1)
                c.drawString(320, y + 4, str(qty))
                price = float(item.get("price", 0))
                c.drawString(370, y + 4, f"Rs. {price:,.0f}")
                c.drawRightString(W - 35, y + 4, f"Rs. {price * qty:,.0f}")
                base_total += price * qty
        else:
            base_total = float(getattr(sr, "total_amount", 0) or 599.0)
            y -= 22
            c.setFont("Helvetica", 10)
            c.drawString(35, y + 4, sr.issue_title or "Standard Service Package")
            c.drawString(320, y + 4, "1")
            c.drawString(370, y + 4, f"Rs. {base_total:,.0f}")
            c.drawRightString(W - 35, y + 4, f"Rs. {base_total:,.0f}")

        # Work extension check
        ext_amount = 0.0
        ext_reason = ""
        try:
            from service_requests.models import WorkExtension
            ext = WorkExtension.objects.filter(
                service_request=sr,
                status__in=[WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.RESOLVED]
            ).first()
            if ext:
                ext_amount = float(ext.admin_approved_amount or ext.technician_estimate or 0)
                ext_reason = ext.decision_notes or "Approved Extension"
        except Exception:
            pass

        if ext_amount > 0:
            y -= 22
            c.setFillColor(HexColor("#FFFBEB"))
            c.rect(25, y - 4, W - 50, 22, fill=1, stroke=0)
            c.setFillColor(HexColor("#B45309"))
            c.setFont("Helvetica-Bold", 9)
            reason_clean = ext_reason[:42] if ext_reason else "Approved Extension"
            c.drawString(35, y + 4, f"Approved Extension: {reason_clean}")
            c.drawString(320, y + 4, "1")
            c.drawString(370, y + 4, f"Rs. {ext_amount:,.0f}")
            c.drawRightString(W - 35, y + 4, f"Rs. {ext_amount:,.0f}")

        final_total = base_total + ext_amount

        # Totals
        y -= 35
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.line(25, y + 20, W - 25, y + 20)
        c.setFont("Helvetica", 10)
        c.drawString(320, y + 4, "Base Subtotal:")
        c.drawRightString(W - 35, y + 4, f"Rs. {base_total:,.0f}")

        if ext_amount > 0:
            y -= 18
            c.drawString(320, y + 4, "Work Extension:")
            c.setFillColor(HexColor("#B45309"))
            c.drawRightString(W - 35, y + 4, f"Rs. {ext_amount:,.0f}")
            c.setFillColor(black)

        y -= 18
        c.drawString(320, y + 4, "Platform Fee:")
        c.setFillColor(HexColor("#059669"))
        c.drawRightString(W - 35, y + 4, "FREE")
        c.setFillColor(black)

        y -= 28
        c.setFillColor(HexColor("#4F46E5"))
        c.rect(310, y - 6, W - 310 - 25, 28, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        is_paid = sr.payment_status in (ServiceRequest.PaymentStatus.PAID, ServiceRequest.PaymentStatus.COLLECTED)
        total_text = "TOTAL PAID:" if is_paid else "TOTAL DUE:"
        c.drawString(320, y + 6, total_text)
        c.drawRightString(W - 35, y + 6, f"₹{final_total:,.2f}")

        # Footer
        c.setFillColor(HexColor("#F1F5F9"))
        c.rect(0, 0, W, 45, fill=1, stroke=0)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(W / 2, 28, "Thank you for choosing Sevo!")
        c.drawCentredString(W / 2, 14, "For support: support@sevo.in | Computer-generated invoice.")

        c.save()
        buffer.seek(0)
        return buffer.read()
