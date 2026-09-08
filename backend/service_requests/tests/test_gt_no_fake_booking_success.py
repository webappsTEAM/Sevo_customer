"""
service_requests/tests/test_gt_no_fake_booking_success.py

A Goods & Transport booking exists only when the backend created the
ServiceRequest. The three GT booking pages used to fabricate one when it had
not: on the failure path they generated a "CRN<12 random digits>" reference,
stored it as the booking id and opened the "looking for a partner" screen, so
a customer whose booking the server had just REJECTED was shown a confirmed
booking with a reference matching nothing in the database -- and then waited
for a driver who was never dispatched.

Structural rather than behavioural because this repository has no frontend
test runner (package.json defines only dev/build/preview/lint). It follows the
pattern already used for source-level invariants elsewhere in the suite --
test_gt_pricing_price_lock.test_reconciliation_never_reads_the_live_tier, and
the vendor app's test_webhook_config_guards -- and it fails loudly if anyone
reintroduces the fallback.
"""
import re
from pathlib import Path

from django.test import SimpleTestCase

FRONTEND_PAGES = Path(__file__).resolve().parents[3] / "frontend" / "src" / "ui" / "pages"

GT_BOOKING_PAGES = [
    "MiniTruckBookingHosurPage.jsx",
    "TwoWheelerBookingHosurPage.jsx",
    "PackersMoversBookingHosurPage.jsx",
]

# "CRN" + Math.floor(... Math.random() ...) -- a client-invented booking id.
FABRICATED_ID = re.compile(r'["\']CRN["\']\s*\+\s*Math\.')


class NoFabricatedBookingReferenceTests(SimpleTestCase):
    def setUp(self):
        if not FRONTEND_PAGES.is_dir():
            self.skipTest("frontend sources not present in this checkout")

    def _source(self, name):
        path = FRONTEND_PAGES / name
        if not path.exists():
            self.skipTest("%s not present" % name)
        return path.read_text(encoding="utf-8", errors="replace")

    def test_no_page_invents_a_booking_reference(self):
        for name in GT_BOOKING_PAGES:
            src = self._source(name)
            self.assertIsNone(
                FABRICATED_ID.search(src),
                "%s fabricates a booking reference; a booking is only real when "
                "the backend created the ServiceRequest" % name,
            )

    def test_the_failure_path_does_not_open_the_success_screen(self):
        # In the catch block the partner-search screen must be closed, never opened.
        for name in GT_BOOKING_PAGES:
            src = self._source(name).replace("\r\n", "\n")
            # The booking submit handler specifically -- these files contain
            # several try/catch blocks.
            marker = 'console.error("Booking creation failed:"'
            self.assertIn(marker, src,
                          "%s: could not locate the booking failure handler" % name)
            start = src.index(marker)
            end = src.index("} finally {", start)
            body = src[start:end]
            self.assertNotIn(
                "setLookingForPartnerOpen(true)", body,
                "%s shows the booking-confirmed screen after a failed booking" % name,
            )
            self.assertIn(
                "setBookingError(", body,
                "%s swallows a booking failure without telling the customer" % name,
            )

    def test_a_response_without_a_request_id_is_treated_as_a_failure(self):
        for name in GT_BOOKING_PAGES:
            src = self._source(name)
            self.assertIn(
                "if (!bookingId) {", src,
                "%s does not check that the server actually returned a request_id" % name,
            )
