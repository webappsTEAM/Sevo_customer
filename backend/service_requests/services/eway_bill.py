"""
Gap 1 (Round 8 verification vs Porter public GT docs): Porter publishes no e-way-bill
*product* of its own -- Indian GST law puts the e-way-bill obligation on the CONSIGNOR
for goods movement above a statutory value/distance threshold, and Porter's own customer
terms simply say the consignor is responsible. So SEVO only records/attaches an e-way-bill
reference against a booking and WARNS (never hard-blocks, matching Porter's own lack of
enforcement) when one looks required and is missing. No generation or government-API
integration lives here or is planned here.
"""
from decimal import Decimal


def eway_bill_warning(service_request):
    """Returns a warning string if this booking's declared_value is at/above the
    Admin-configured GTOperationsConfig.eway_bill_required_above threshold and neither
    an e-way-bill number nor document has been attached yet, else None. Safe to call at
    any point (booking, pre-dispatch, dispatch) -- never raises, never blocks."""
    try:
        declared_value = service_request.declared_value
        if declared_value is None:
            return None
        if service_request.eway_bill_number or service_request.eway_bill_document:
            return None
        from ..models import GTOperationsConfig
        cfg = GTOperationsConfig.objects.filter(is_active=True).order_by("-updated_at", "-id").first()
        threshold = Decimal(str(cfg.eway_bill_required_above)) if cfg else Decimal("50000")
        if Decimal(str(declared_value)) >= threshold:
            return (
                f"Declared value ₹{declared_value:,.0f} is at or above the ₹{threshold:,.0f} "
                "e-way-bill threshold. Indian GST law places e-way-bill responsibility on the "
                "consignor -- attach an e-way-bill number/document before dispatch if one applies "
                "to this consignment."
            )
    except Exception:
        return None
    return None
