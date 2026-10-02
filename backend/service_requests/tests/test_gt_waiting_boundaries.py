"""GT waiting-charge boundaries: below / exactly at / above grace, multiple
intervals, partial-minute rounding, cap, disabled. Pure (no DB rows)."""
from datetime import datetime, timedelta, timezone as dt_tz
from decimal import Decimal
from types import SimpleNamespace
from django.test import SimpleTestCase
from service_requests.models import GTWaitingChargePolicy


def _sr(load_s, unload_s):
    t0 = datetime(2026, 10, 1, 10, 0, tzinfo=dt_tz.utc)
    h = [{"leg": "LOADING", "at": t0.isoformat()},
         {"leg": "EN_ROUTE_DROP", "at": (t0 + timedelta(seconds=load_s)).isoformat()},
         {"leg": "UNLOADING", "at": (t0 + timedelta(hours=1)).isoformat()},
         {"leg": "DELIVERED", "at": (t0 + timedelta(hours=1, seconds=unload_s)).isoformat()}]
    return SimpleNamespace(service_category="goods_transport_truck", logistics_leg_history=h,
                           trip_stops=SimpleNamespace(all=lambda: []))


def _p(**kw):
    d = dict(is_enabled=True, is_active=True, free_minutes_per_stop=10, rate_per_minute=Decimal("2"))
    d.update(kw)
    return GTWaitingChargePolicy(**d)


class WaitingBoundaryTests(SimpleTestCase):
    def test_below_grace_free(self):
        self.assertEqual(_p().charge_for(_sr(9 * 60, 5 * 60)), Decimal("0"))

    def test_exactly_at_grace_free(self):
        self.assertEqual(_p().charge_for(_sr(10 * 60, 10 * 60)), Decimal("0"))

    def test_one_second_over_grace_bills_one_minute(self):
        self.assertEqual(_p().charge_for(_sr(10 * 60 + 1, 0)), Decimal("2"))

    def test_multiple_intervals_both_stops(self):
        # loading 25 -> 15 billable, unloading 40 -> 30 billable = 45 x 2
        self.assertEqual(_p().charge_for(_sr(25 * 60, 40 * 60)), Decimal("90"))

    def test_cap_and_disabled(self):
        self.assertEqual(_p(max_charge_per_booking=Decimal("40")).charge_for(_sr(25 * 60, 40 * 60)), Decimal("40"))
        self.assertEqual(_p(is_enabled=False).charge_for(_sr(25 * 60, 40 * 60)), Decimal("0"))

    def test_p_and_m_category_not_billed_by_fallback(self):
        s = _sr(25 * 60, 40 * 60); s.service_category = "packers_movers"
        self.assertEqual(_p().charge_for(s), Decimal("0"))
