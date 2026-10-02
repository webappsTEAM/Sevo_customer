"""GSTIN / E-Way Bill format validation shared by booking creation and any
future billing profile."""
import re

from rest_framework import serializers

# 2-digit state code, 10-char PAN, entity number, literal Z, check character.
_GSTIN_RE = re.compile(r"^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")

# India's E-Way Bill Number (EBN) is a 12-digit numeric code. Some ERPs pad
# or format it differently, so this is deliberately lenient (10-15 digits)
# rather than exactly 12 -- the point of this field, added 2026-09-30, is
# just to stop bookings from crashing (see models.py's eway_bill_number
# comment), not to be a strict GST compliance gate.
_EWAY_BILL_RE = re.compile(r"^[0-9]{10,15}$")


def normalize_gstin(value):
    """Upper-cased GSTIN, "" when blank; raises ValidationError when the format is wrong."""
    v = (value or "").strip().upper().replace(" ", "")
    if not v:
        return ""
    if not _GSTIN_RE.match(v):
        raise serializers.ValidationError("Enter a valid 15-character GSTIN.")
    return v


def normalize_eway_bill_number(value):
    """Digits-only E-Way Bill number, "" when blank; raises ValidationError when the format is wrong."""
    v = (value or "").strip().replace(" ", "")
    if not v:
        return ""
    if not _EWAY_BILL_RE.match(v):
        raise serializers.ValidationError("Enter a valid E-Way Bill number (digits only).")
    return v
