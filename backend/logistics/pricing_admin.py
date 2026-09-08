"""
logistics/pricing_admin.py

Administrator-managed Goods & Transport pricing.

What this is NOT: a second fare engine. Nothing here computes a fare.
quote_logistics_fare() remains the single calculation authority; this module
only governs the ServiceTier rows that authority reads from, and records who
changed what.

Three rules shape it:

1. **Changing a rate never re-prices an existing booking.** A quote records
   the rates it used inside fare_breakdown, and reconciliation re-prices from
   that snapshot alone. This module therefore affects new quotes only, and
   the API says so in every response.

2. **`modify_price` is checked per field, not per request.** The RBAC matrix
   already distinguishes `edit` from `modify_price` on the `pricing` module:
   finance and manager hold `edit`, only admin and catalog hold
   `modify_price`. Gating the whole request on `modify_price` would lock
   finance out of toggling a tier active; gating it on `edit` would let them
   change rates. So the rule is the field's, not the endpoint's.

3. **Every changed field is audited, with a reason.** Reuses
   CatalogChangeLog rather than adding a second audit trail -- its soft
   entity_type + entity_id reference was built to span unrelated tables, and
   ServiceTier lives in a different app.
"""
import logging
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

logger = logging.getLogger(__name__)

# Fields whose modification requires `pricing:modify_price`. Everything a
# customer is charged from.
PRICING_FIELDS = (
    "base_fare",
    "per_km_rate",
    "free_km",
    "minimum_fare",
    "loading_unloading_charge",
    "additional_stop_charge",
    "surge_multiplier",
    "starting_price",
)

# Fields an operator may change with plain `pricing:edit`. Identity and
# availability, not money.
DESCRIPTIVE_FIELDS = (
    "name",
    "is_active",
    "capacity_label",
    "dimensions_label",
    "description",
    "order",
)

EDITABLE_FIELDS = PRICING_FIELDS + DESCRIPTIVE_FIELDS

# category / slug / city are exposed for reading and filtering but are NOT
# editable here: together they are the tier's identity (unique_together), the
# seed command matches on them, and the Package sync maps onto slug. Renaming
# one through a pricing screen would silently orphan a tier from both.
IDENTITY_FIELDS = ("category", "slug", "city")


class PricingPermissionError(PermissionError):
    """Raised when the actor may not change the fields they asked to change."""

    def __init__(self, message, fields):
        super().__init__(message)
        self.fields = list(fields)


class PricingConflictError(Exception):
    """The tier changed underneath the editor since they loaded it."""


def _dec(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def changed_fields(tier, data):
    """
    Which editable fields the payload would actually change.

    Compared as Decimals for the numeric ones, so "22.00" and 22 and
    Decimal("22.0") are correctly seen as no change -- an admin re-saving a
    form without touching anything must not produce audit noise.

    Raises DjangoValidationError when a rate is present but unparseable.
    That distinction matters: _dec() returns None both for "clear this field"
    and for "this is not a number", and collapsing the two meant a typo in a
    NULLABLE rate (per_km_rate, base_fare, minimum_fare) was stored as NULL and
    reported as a successful save -- which silently switched the tier off
    distance pricing onto its flat starting price. An empty string and an
    explicit null still mean "clear it"; anything else must parse.
    """
    changed = {}
    invalid = {}
    for field in EDITABLE_FIELDS:
        if field not in data:
            continue
        new = data[field]
        old = getattr(tier, field)
        if field in PRICING_FIELDS:
            if new is None or (isinstance(new, str) and new.strip() == ""):
                new_dec = None
            else:
                new_dec = _dec(new)
                if new_dec is None:
                    invalid[field] = ["Enter a valid number."]
                    continue
            old_dec = None if old is None else _dec(old)
            if new_dec == old_dec:
                continue
            changed[field] = new_dec
        else:
            if isinstance(old, bool) or isinstance(new, bool):
                if bool(old) == bool(new):
                    continue
                changed[field] = bool(new)
            else:
                if str(old or "") == str(new or ""):
                    continue
                changed[field] = new
    if invalid:
        raise DjangoValidationError(invalid)
    return changed


def assert_may_change(actor, fields):
    """
    Check the actor against the RBAC matrix, per field.

    `pricing:modify_price` for anything in PRICING_FIELDS,
    `pricing:edit` for the descriptive ones.
    """
    from accounts.permissions import can

    priced = [f for f in fields if f in PRICING_FIELDS]
    plain = [f for f in fields if f not in PRICING_FIELDS]

    if priced and not can(actor, "pricing", "modify_price"):
        raise PricingPermissionError(
            "Your role can view pricing but not change it. Changing rates "
            "requires the 'modify_price' permission on the pricing module.",
            priced,
        )
    if plain and not can(actor, "pricing", "edit"):
        raise PricingPermissionError(
            "Your role does not have permission to edit service tiers.",
            plain,
        )


@transaction.atomic
def update_tier_pricing(tier, data, actor, reason="", expected_updated_at=None):
    """
    Apply an administrator's edit to one ServiceTier.

    Returns (tier, [audit rows]). An empty list means nothing changed --
    which is a success, not an error.

    Raises PricingPermissionError, PricingConflictError, or Django's
    ValidationError; the view maps each to a status code.
    """
    from service_requests.models import CatalogChangeLog

    # Optimistic concurrency. Two operators with the same screen open would
    # otherwise silently overwrite each other, and the loser's audit row
    # would make it look as though their change had stuck.
    if expected_updated_at:
        # Compared as INSTANTS, not strings. DRF renders datetimes in the
        # project's local timezone (+05:30) while datetime.isoformat() here
        # yields UTC, so a string comparison reports a conflict for two
        # spellings of the same moment -- which would make the guard fire on
        # every honest save and teach operators to ignore it.
        from django.utils.dateparse import parse_datetime

        sent = parse_datetime(str(expected_updated_at))
        if sent is None:
            raise PricingConflictError(
                "Could not read the version stamp sent with this edit. "
                "Reload the tier and try again."
            )
        current = tier.updated_at
        # auto_now timestamps carry microseconds that some clients truncate;
        # compare to the second so a round-tripped value still matches.
        if current is None or abs((sent - current).total_seconds()) >= 1:
            raise PricingConflictError(
                "This tier was changed by someone else while you were editing it. "
                "Reload to see the current rates before saving."
            )

    changes = changed_fields(tier, data)
    if not changes:
        return tier, []

    assert_may_change(actor, changes.keys())

    rows = []
    for field, new_value in changes.items():
        rows.append({
            "field": field,
            "old": getattr(tier, field),
            "new": new_value,
        })
        setattr(tier, field, new_value)

    # full_clean runs the model validators added for exactly this path --
    # non-negative money, surge bounded. Raises ValidationError, which the
    # view turns into a 400 rather than a 500.
    tier.full_clean(exclude=[f.name for f in tier._meta.fields
                             if f.name not in changes])
    tier.save(update_fields=list(changes.keys()) + ["updated_at"])

    # Synchronize starting_price to matching catalog Package if starting_price changed
    if "starting_price" in changes and changes["starting_price"] is not None:
        try:
            from service_requests.services.catalog import _package_for_logistics_tier
            pkg = _package_for_logistics_tier(tier)
            if pkg and pkg.base_price != tier.starting_price:
                old_pkg_price = pkg.base_price
                pkg.base_price = tier.starting_price
                pkg.save(update_fields=["base_price", "updated_at"])
                CatalogChangeLog.objects.create(
                    entity_type=CatalogChangeLog.EntityType.PACKAGE,
                    entity_id=pkg.id,
                    entity_name=pkg.name,
                    action=CatalogChangeLog.Action.UPDATE,
                    field_name="base_price",
                    old_value="" if old_pkg_price is None else str(old_pkg_price),
                    new_value=str(tier.starting_price),
                    reason=f"Synchronized from ServiceTier #{tier.id} ({tier.slug}) pricing update: {reason}",
                    changed_by=actor if getattr(actor, "is_authenticated", False) else None,
                )
        except Exception as exc:
            logger.warning("Could not synchronize starting_price to Package for tier #%s: %s", tier.id, exc)

    logged = []
    for row in rows:
        logged.append(CatalogChangeLog.objects.create(
            entity_type=CatalogChangeLog.EntityType.SERVICE_TIER,
            entity_id=tier.id,
            entity_name=f"{tier.name} ({tier.get_category_display()}, {tier.city})",
            action=CatalogChangeLog.Action.UPDATE,
            field_name=row["field"],
            old_value="" if row["old"] is None else str(row["old"]),
            new_value="" if row["new"] is None else str(row["new"]),
            reason=reason or "",
            changed_by=actor if getattr(actor, "is_authenticated", False) else None,
        ))

    logger.info(
        "ServiceTier #%s (%s) pricing updated by %s: %s",
        tier.id, tier.slug, getattr(actor, "id", "anonymous"),
        ", ".join(f"{r['field']} {r['old']}->{r['new']}" for r in rows),
    )
    return tier, logged


def tier_history(tier_id, limit=50):
    """Audit rows for one tier, newest first."""
    from service_requests.models import CatalogChangeLog

    return (
        CatalogChangeLog.objects
        .filter(
            entity_type=CatalogChangeLog.EntityType.SERVICE_TIER,
            entity_id=tier_id,
        )
        .select_related("changed_by")
        .order_by("-created_at")[:limit]
    )
