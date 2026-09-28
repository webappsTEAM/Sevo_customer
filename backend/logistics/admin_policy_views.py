"""
logistics/admin_policy_views.py

Admin API for the three Goods & Transport / Packers & Movers money policies that live in
service_requests: cancellation fee, waiting (detention) charge and advance payment.

They were only editable through the Django /admin/ site, so the product's own Admin panel
(GT Pricing) could not set them -- while the fare pages it *can* edit read them at booking
and cancellation time. Every policy defaults to "no effect"; nothing here invents a value.

    GET    /api/logistics/admin/policies/                 -- all three kinds + the category list
    POST   /api/logistics/admin/policies/<kind>/          -- create
    PATCH  /api/logistics/admin/policies/<kind>/<pk>/     -- edit
    DELETE /api/logistics/admin/policies/<kind>/<pk>/     -- deactivate (rows are kept for audit)

<kind> is one of: cancellation, waiting, advance.
"""
from decimal import Decimal, InvalidOperation

from rest_framework import permissions, status
from rest_framework.views import APIView

from service_requests.models import (
    CatalogChangeLog, GTAdvancePaymentPolicy, GTCancellationPolicy, GTWaitingChargePolicy,
)

from .admin_views import _can, _fail, _ok

# Blank category = platform-wide fallback (see get_gt_*() in service_requests/models.py).
POLICY_CATEGORIES = ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers")

_MONEY = "money"
_PERCENT = "percent"
_INT = "int"
_BOOL = "bool"
_CHOICE = "choice"

KINDS = {
    "cancellation": {
        "model": GTCancellationPolicy,
        "fields": {
            "fee_mode": (_CHOICE, tuple(GTCancellationPolicy.FeeMode.values)),
            "flat_fee_amount": (_MONEY, None),
            "percent_fee": (_PERCENT, None),
            "applies_only_after_assignment": (_BOOL, None),
            "grace_period_seconds": (_INT, None),
            "is_active": (_BOOL, None),
        },
    },
    "waiting": {
        "model": GTWaitingChargePolicy,
        "fields": {
            "is_enabled": (_BOOL, None),
            "free_minutes_per_stop": (_INT, None),
            "rate_per_minute": (_MONEY, None),
            "max_charge_per_booking": (_MONEY, "nullable"),
            "is_active": (_BOOL, None),
        },
    },
    "advance": {
        "model": GTAdvancePaymentPolicy,
        "fields": {
            "is_enabled": (_BOOL, None),
            "advance_percent": (_PERCENT, None),
            "is_active": (_BOOL, None),
        },
    },
}


def _serialize(kind, row):
    out = {"id": row.id, "kind": kind, "service_category": row.service_category,
           "updated_at": row.updated_at.isoformat() if row.updated_at else None}
    for name in KINDS[kind]["fields"]:
        value = getattr(row, name)
        out[name] = str(value) if isinstance(value, Decimal) else value
    return out


class _Invalid(Exception):
    pass


def _coerce(name, spec, raw):
    kind, extra = spec
    if kind == _BOOL:
        if isinstance(raw, bool):
            return raw
        if str(raw).strip().lower() in ("true", "1", "yes"):
            return True
        if str(raw).strip().lower() in ("false", "0", "no"):
            return False
        raise _Invalid(f"{name} must be true or false.")
    if kind == _CHOICE:
        value = str(raw or "").strip().upper()
        if value not in extra:
            raise _Invalid(f"{name} must be one of {', '.join(extra)}.")
        return value
    if kind == _INT:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise _Invalid(f"{name} must be a whole number.")
        if value < 0:
            raise _Invalid(f"{name} cannot be negative.")
        return value
    if raw in (None, "") and extra == "nullable":
        return None
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, ValueError):
        raise _Invalid(f"{name} must be a number.")
    if not value.is_finite() or value < 0:
        raise _Invalid(f"{name} cannot be negative.")
    if kind == _PERCENT and value > 100:
        raise _Invalid(f"{name} cannot exceed 100.")
    return value.quantize(Decimal("0.01"))


def _clean(kind, data, *, partial):
    if not isinstance(data, dict):
        raise _Invalid("A JSON object is required.")
    cleaned = {}
    if "service_category" in data or not partial:
        category = str(data.get("service_category") or "").strip().lower()
        if category and category not in POLICY_CATEGORIES:
            raise _Invalid(f"service_category must be blank (platform-wide) or one of {', '.join(POLICY_CATEGORIES)}.")
        cleaned["service_category"] = category
    for name, spec in KINDS[kind]["fields"].items():
        if name in data:
            cleaned[name] = _coerce(name, spec, data[name])
    # Fee math would silently be 0 (or nonsense) for a mode without its amount.
    return cleaned


def _validate_business_rules(kind, values):
    if kind == "cancellation":
        mode = values.get("fee_mode")
        if mode == "FLAT" and not Decimal(str(values.get("flat_fee_amount") or 0)) > 0:
            raise _Invalid("A FLAT cancellation fee needs a flat_fee_amount greater than 0.")
        if mode == "PERCENT" and not Decimal(str(values.get("percent_fee") or 0)) > 0:
            raise _Invalid("A PERCENT cancellation fee needs a percent_fee greater than 0.")
    if kind == "waiting" and values.get("is_enabled") and not Decimal(str(values.get("rate_per_minute") or 0)) > 0:
        raise _Invalid("An enabled waiting charge needs a rate_per_minute greater than 0.")
    if kind == "advance" and values.get("is_enabled"):
        pct = Decimal(str(values.get("advance_percent") or 0))
        if not (0 < pct <= 100):
            raise _Invalid("An enabled advance payment needs an advance_percent between 0 and 100.")


def _clash(kind, category, exclude_id=None):
    qs = KINDS[kind]["model"].objects.filter(service_category__iexact=category, is_active=True)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()


def _log(request, kind, row, field, old, new, reason):
    try:
        CatalogChangeLog.objects.create(
            entity_type="GTPolicy", entity_id=row.id, field_name=f"{kind}.{field}",
            old_value=str(old)[:255], new_value=str(new)[:255], changed_by=request.user,
            reason=str(reason or "Edited via Logistics Admin API").strip()[:255],
        )
    except Exception:
        pass


class AdminGTPolicyOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view policies.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        data = {
            kind: [_serialize(kind, r) for r in spec["model"].objects.order_by("service_category", "-is_active", "id")]
            for kind, spec in KINDS.items()
        }
        data["categories"] = list(POLICY_CATEGORIES)
        return _ok(data)


class AdminGTPolicyListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, kind):
        if kind not in KINDS:
            return _fail("Unknown policy kind.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit policies.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        try:
            values = _clean(kind, request.data, partial=False)
            merged = {**{n: getattr(KINDS[kind]["model"](), n) for n in KINDS[kind]["fields"]}, **values}
            _validate_business_rules(kind, merged)
        except _Invalid as exc:
            return _fail(str(exc), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST)
        if values.get("is_active", True) and _clash(kind, values["service_category"]):
            return _fail(
                "An active policy already exists for this category; edit or deactivate it instead.",
                "POLICY_EXISTS", status.HTTP_409_CONFLICT,
            )
        row = KINDS[kind]["model"].objects.create(**values)
        _log(request, kind, row, "created", "", values.get("service_category") or "platform-wide",
             (request.data or {}).get("reason"))
        return _ok(_serialize(kind, row))


class AdminGTPolicyDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _row(self, kind, pk):
        if kind not in KINDS:
            return None
        return KINDS[kind]["model"].objects.filter(pk=pk).first()

    def get(self, request, kind, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view policies.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        row = self._row(kind, pk)
        if not row:
            return _fail("Policy not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(_serialize(kind, row))

    def patch(self, request, kind, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit policies.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        row = self._row(kind, pk)
        if not row:
            return _fail("Policy not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        try:
            values = _clean(kind, request.data, partial=True)
            merged = {n: getattr(row, n) for n in KINDS[kind]["fields"]}
            merged.update(values)
            _validate_business_rules(kind, merged)
        except _Invalid as exc:
            return _fail(str(exc), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST)
        category = values.get("service_category", row.service_category)
        active = values.get("is_active", row.is_active)
        if active and _clash(kind, category, exclude_id=row.id):
            return _fail(
                "Another active policy already exists for this category.", "POLICY_EXISTS", status.HTTP_409_CONFLICT,
            )
        for name, value in values.items():
            old = getattr(row, name)
            if old != value:
                setattr(row, name, value)
                _log(request, kind, row, name, old, value, (request.data or {}).get("reason"))
        row.save()
        return _ok(_serialize(kind, row))

    def delete(self, request, kind, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit policies.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        row = self._row(kind, pk)
        if not row:
            return _fail("Policy not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if row.is_active:
            row.is_active = False
            row.save(update_fields=["is_active", "updated_at"])
            _log(request, kind, row, "is_active", True, False, "Deactivated via Logistics Admin API")
        return _ok(_serialize(kind, row))
