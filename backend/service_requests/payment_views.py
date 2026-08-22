"""
service_requests/payment_views.py

Payment-specific API views:
  - Payment initiation / verification (simulates gateway / Razorpay flow)
  - Admin payment status overrides
  - Customer & Admin Invoice PDF generation
"""
import logging
import uuid
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ServiceRequest
from .serializers import ServiceRequestDetailSerializer

logger = logging.getLogger(__name__)


def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400):
    return Response({"success": False, "message": message}, status=status_code)


# ─── Payment Initiation & Verification ────────────────────────────────────────

class PaymentInitiateView(APIView):
    """
    POST /api/payment/initiate/
    Creates a payment order for the given booking.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        if not booking_id:
            return _error("booking_id is required.")

        try:
            sr = ServiceRequest.objects.get(pk=booking_id)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        if sr.payment_method != ServiceRequest.PaymentMethod.ONLINE:
            return _error("This booking does not require online payment.")

        if sr.payment_status == ServiceRequest.PaymentStatus.PAID:
            return _error("This booking is already paid.")

        mock_order_id = f"order_cal_{uuid.uuid4().hex[:16]}"

        return _success(
            data={
                "order_id": mock_order_id,
                "amount": float(sr.total_amount),
                "currency": "INR",
                "booking_id": sr.id,
                "request_id": sr.request_id,
                "customer_name": sr.customer_name,
                "customer_email": sr.email or "",
                "customer_phone": sr.phone or "",
                "description": f"Payment for {sr.issue_title}",
            },
            message="Payment order created.",
        )


class PaymentVerifyView(APIView):
    """
    POST /api/payment/verify/
    Verifies payment completion.
    On success: updates booking status to Confirmed, payment_status to Paid.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        booking_id   = request.data.get("booking_id")
        order_id     = request.data.get("order_id")
        payment_id   = request.data.get("payment_id")
        mock_success = request.data.get("mock_success", True)

        if not booking_id:
            return _error("booking_id is required.")

        try:
            sr = ServiceRequest.objects.get(pk=booking_id)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        if not mock_success:
            sr.payment_status = ServiceRequest.PaymentStatus.FAILED
            sr.save(update_fields=["payment_status", "updated_at"])
            return _error("Payment failed. Please try again.")

        sr.status         = ServiceRequest.Status.CONFIRMED
        sr.payment_status = ServiceRequest.PaymentStatus.PAID
        sr.transaction_id = payment_id or f"TXN_{uuid.uuid4().hex[:12].upper()}"
        sr.payment_gateway = "gateway"
        if not sr.invoice_id:
            sr.invoice_id = f"INV-{sr.request_id}-{uuid.uuid4().hex[:6].upper()}"
        sr.save(update_fields=["status", "payment_status", "transaction_id", "payment_gateway", "invoice_id", "updated_at"])

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
    """
    permission_classes = [permissions.AllowAny]

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
