"""
align_customer_prices.py

DEPRECATED as of the Goods & Transport unification, Phase 2 -- do not run
this script.

It used to hardcode a snapshot of Truck / 2-Wheeler / Packers & Movers
pricing and, on every run, DELETE every Package under those three services
and recreate them from that snapshot, plus write logistics.ServiceTier
directly. Both of those are now actively harmful:

  1. Package is the single source of truth for Goods & Transport pricing
     (Catalog > Packages > "Goods & Transport Distance Pricing"). This
     script's Package.objects.filter(service=...).delete() would silently
     wipe out every admin edit made since this snapshot was written --
     including sub_service_key assignments, the gt_* distance-pricing
     fields, and anything synced from ServiceTier.

  2. Writing logistics.ServiceTier directly bypasses the sync bridge in
     service_requests/services/catalog.py entirely. ServiceTier is now a
     mirror written FROM Package; a tier written by this script would be
     immediately stale (or fight with) the next admin save on the linked
     Package, and would carry none of the gt_* distance-pricing fields
     (per_km_rate, free_km, etc.) this script never knew about.

If you need to bulk-fix Goods & Transport pricing, do it through the normal
Package admin API/UI (or a properly-scoped one-off script that calls
service_requests.services.catalog.update_package(), so the ServiceTier
mirror and audit trail stay correct) -- not this file.

Deliberately left non-functional (raises immediately) rather than deleted,
so anyone who tries to run it out of habit gets an explanation instead of
a surprise.
"""
import sys


def sync_prices():
    raise RuntimeError(
        "align_customer_prices.py is deprecated and must not be run. "
        "Goods & Transport pricing is now managed on the Package itself "
        "(Catalog > Packages > \"Goods & Transport Distance Pricing\"). "
        "See this file's module docstring for why running the old logic "
        "here would silently delete admin-configured pricing data."
    )


if __name__ == "__main__":
    print(
        "align_customer_prices.py is deprecated and will not run. "
        "See the top of this file for why.",
        file=sys.stderr,
    )
    sys.exit(1)
