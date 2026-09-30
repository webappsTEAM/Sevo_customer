"""
logistics/admin_list_views.py

Admin API for the Goods & Transport lists that previously had no product-Admin screen
(only Django /admin/ or nothing at all), so ops could not change them without a developer:

    prohibited-rules  -- logistics.ProhibitedGoodsRule (commercial prohibited-items list)
    pm-surcharges     -- logistics.PackersMoversSurchargeRule (peak-day / out-of-hours surcharges)
    cities            -- settings_hub.City (which cities are shown / launched)

    GET    /api/logistics/admin/lists/<resource>/            -- all rows (active and inactive)
    POST   /api/logistics/admin/lists/<resource>/            -- create
    PATCH  /api/logistics/admin/lists/<resource>/<pk>/       -- edit
    DELETE /api/logistics/admin/lists/<resource>/<pk>/       -- deactivate (rows kept)

Validation is the model's own full_clean() (field validators, unique slugs/labels and, for
surcharges, PackersMoversSurchargeRule.clean()), so this cannot accept a row the booking code
would misread. The P&M add-on catalogue keeps its existing /admin/pm-addons/ endpoints.
Permissions: the same pricing/catalog view/edit rights as the rest of GT Pricing.
"""
from django.core.exceptions import ValidationError
from rest_framework import permissions, serializers, status
from rest_framework.views import APIView

from .admin_views import _can, _fail, _ok


def _resources():
    from settings_hub.models import City
    from .models import PackersMoversSurchargeRule, ProhibitedGoodsRule
    return {
        "prohibited-rules": (ProhibitedGoodsRule, [
            "label", "keywords", "message", "applies_to_packers_movers", "is_active"]),
        "pm-surcharges": (PackersMoversSurchargeRule, [
            "name", "rule_type", "city", "weekdays", "day_from", "day_to", "on_date",
            "window_start", "window_end", "percent", "flat_amount", "is_active"]),
        "cities": (City, ["name", "slug", "state", "is_launched", "is_active", "display_order"]),
    }


def _serializer(model, fields):
    meta = type("Meta", (), {"model": model, "fields": ["id", *fields], "read_only_fields": ["id"]})
    cls = type(f"{model.__name__}AdminListSerializer", (serializers.ModelSerializer,), {"Meta": meta})
    # Uniqueness is checked by full_clean() below, with the model's own message.
    cls.get_validators = lambda self: []
    return cls


def _errors(exc):
    if hasattr(exc, "message_dict"):
        return {k: [str(m) for m in v] for k, v in exc.message_dict.items()}
    return {"detail": [str(m) for m in exc.messages]}


def _first_message(errors):
    for field, msgs in errors.items():
        if msgs:
            return msgs[0] if field in ("__all__", "detail") else f"{field}: {msgs[0]}"
    return "Invalid data."


def _save(instance, data, fields):
    for name, value in data.items():
        if name in fields:
            setattr(instance, name, value)
    try:
        instance.full_clean()
    except ValidationError as exc:
        return _errors(exc)
    instance.save()
    return None


class AdminListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, resource):
        spec = _resources().get(resource)
        if not spec:
            return _fail("Unknown list.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        model, fields = spec
        rows = model.objects.all().order_by("-is_active", *model._meta.ordering or ["id"])
        return _ok(_serializer(model, fields)(rows, many=True).data)

    def post(self, request, resource):
        spec = _resources().get(resource)
        if not spec:
            return _fail("Unknown list.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if not _can(request.user, "edit"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        model, fields = spec
        ser = _serializer(model, fields)(data=request.data)
        if not ser.is_valid():
            errs = {k: [str(m) for m in v] for k, v in ser.errors.items()}
            return _fail(_first_message(errs), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST, errors=errs)
        instance = model()
        errs = _save(instance, ser.validated_data, fields)
        if errs:
            return _fail(_first_message(errs), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST, errors=errs)
        return _ok(_serializer(model, fields)(instance).data)


class AdminListDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, resource, pk):
        spec = _resources().get(resource)
        if not spec:
            return None, None
        return spec, spec[0].objects.filter(pk=pk).first()

    def patch(self, request, resource, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        spec, row = self._get(resource, pk)
        if row is None:
            return _fail("Not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        model, fields = spec
        ser = _serializer(model, fields)(row, data=request.data, partial=True)
        if not ser.is_valid():
            errs = {k: [str(m) for m in v] for k, v in ser.errors.items()}
            return _fail(_first_message(errs), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST, errors=errs)
        errs = _save(row, ser.validated_data, fields)
        if errs:
            return _fail(_first_message(errs), "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST, errors=errs)
        return _ok(_serializer(model, fields)(row).data)

    def delete(self, request, resource, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        spec, row = self._get(resource, pk)
        if row is None:
            return _fail("Not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if row.is_active:
            row.is_active = False
            row.save(update_fields=["is_active"])
        return _ok(_serializer(*spec)(row).data)
