"""GSTIN format validation shared by booking creation and any future billing profile."""
import re

from rest_framework import serializers

# 2-digit state code, 10-char PAN, entity number, literal Z, check character.
_GSTIN_RE = re.compile(r"^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def normalize_gstin(value):
    """Upper-cased GSTIN, "" when blank; raises ValidationError when the format is wrong."""
    v = (value or "").strip().upper().replace(" ", "")
    if not v:
        return ""
    if not _GSTIN_RE.match(v):
        raise serializers.ValidationError("Enter a valid 15-character GSTIN.")
    return v
