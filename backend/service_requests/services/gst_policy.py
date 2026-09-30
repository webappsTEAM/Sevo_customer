"""
service_requests/services/gst_policy.py

Round 13 (Final Configurability Pass): resolves the GT GST/RCM configuration
(service_requests.models.GTTaxPolicy) for a booking's service_category, and
turns it into the plain (rcm_applicable, statement) decision that
logistics_pricing.quote_logistics_fare() and the invoice renderer act on.

No tax logic beyond simple configuration lookups lives here -- whether RCM
actually applies under Indian GST law for a given GT service is an Admin
decision recorded in GTTaxPolicy, not something this module infers.
"""
from decimal import Decimal


def resolve_tax_treatment(service_category, customer_gstin=None, as_of=None):
    """
    Returns a dict:
        policy               GTTaxPolicy instance or None
        gst_enabled           bool -- False force-suppresses the GST line
        rcm_applicable        bool -- True means: do not charge GST to the
                               customer, show the RCM statement instead
        rcm_statement          str -- printed on the invoice when rcm_applicable
        classification_basis   str -- human-readable note on why (or why not)

    Never raises. With no GTTaxPolicy row configured (the default, unmodified
    install), this returns gst_enabled=True, rcm_applicable=False -- today's
    exact behavior (GST shown per tier/package rate, never RCM).
    """
    from ..models import get_active_gt_tax_policy

    try:
        policy = get_active_gt_tax_policy(service_category, as_of=as_of)
    except Exception:
        policy = None

    if policy is None:
        return {
            "policy": None,
            "gst_enabled": True,
            "rcm_applicable": False,
            "rcm_statement": "",
            "classification_basis": "No GT tax policy configured -- default behavior.",
        }

    gst_enabled = bool(policy.gst_enabled)

    rcm_applicable = False
    basis = "RCM not enabled for this scope."
    if policy.rcm_enabled:
        gstin = (customer_gstin or "").strip()
        if policy.rcm_applies_when_gstin_registered:
            if gstin:
                rcm_applicable = True
                basis = "RCM enabled for this scope; customer supplied a GSTIN."
            else:
                basis = "RCM enabled for this scope, but no customer GSTIN was supplied."
        else:
            # RCM enabled for the whole scope regardless of GSTIN -- an
            # Admin decision this simple toggle also supports (e.g. every
            # booking in a category is, by Admin's own determination,
            # RCM-liable).
            rcm_applicable = True
            basis = "RCM enabled for this scope unconditionally (not gated on GSTIN)."

    return {
        "policy": policy,
        "gst_enabled": gst_enabled,
        "rcm_applicable": rcm_applicable,
        "rcm_statement": (policy.rcm_statement or "").strip() if rcm_applicable else "",
        "classification_basis": basis,
    }
