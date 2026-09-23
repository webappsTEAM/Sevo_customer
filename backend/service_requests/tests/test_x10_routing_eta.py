"""
service_requests/tests/test_x10_routing_eta.py

X-10: server-side routing/ETA (service_requests/services/routing.py).

This sandbox cannot reach the real Google Maps API (confirmed unreachable
egress), so the "success" path is verified against a mocked
requests.get -- these tests are about get_route_eta()'s own decision
logic (cache, parsing, fallback triggers), not about Google's API itself.

Covers:
1. No API key configured -> straight-line estimate, no HTTP call made.
2. API key configured, Maps call succeeds -> real distance/duration,
   source="google_maps", result gets cached (second call is a cache hit,
   requests.get called exactly once).
3. Maps call raises (network error/timeout) -> falls back to straight-line
   estimate, never raises out of get_route_eta.
4. Maps responds 200 but top-level status != OK (e.g. REQUEST_DENIED) ->
   falls back to straight-line estimate.
5. Maps responds OK but the per-element status != OK (e.g. ZERO_RESULTS)
   -> falls back to straight-line estimate.
6. Missing/None coordinates -> returns None (nothing to compute).
7. Straight-line fallback's duration matches the previous flat 25 km/h
   assumption this replaces, so behavior is a strict upgrade, not a
   regression, whenever Maps is unavailable.
"""
from unittest.mock import patch, MagicMock

from django.core.cache import cache
from django.test import TestCase, override_settings

from service_requests.services import routing


class RoutingEtaTests(TestCase):
    def setUp(self):
        cache.clear()

    # Hosur-area coordinates reused from the GT-D-02 test fixtures.
    ORIGIN = (12.7000000, 77.8000000)
    DEST = (12.7500000, 77.8500000)

    @override_settings(GOOGLE_MAPS_API_KEY="")
    def test_no_api_key_uses_straight_line_estimate(self):
        with patch.object(routing.requests, "get") as mock_get:
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        mock_get.assert_not_called()
        self.assertIsNotNone(result)
        self.assertEqual(result["source"], "straight_line_estimate")
        self.assertGreater(result["distance_km"], 0)
        self.assertGreater(result["duration_seconds"], 0)

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_successful_maps_call_returns_real_route_and_caches(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "rows": [{"elements": [{
                "status": "OK",
                "distance": {"value": 8300},   # meters
                "duration": {"value": 1260},   # seconds
            }]}],
        }
        mock_resp.raise_for_status.return_value = None

        with patch.object(routing.requests, "get", return_value=mock_resp) as mock_get:
            first = routing.get_route_eta(*self.ORIGIN, *self.DEST)
            second = routing.get_route_eta(*self.ORIGIN, *self.DEST)

        self.assertEqual(mock_get.call_count, 1, "second call should be served from cache")
        self.assertEqual(first["source"], "google_maps")
        self.assertEqual(first["distance_km"], 8.3)
        self.assertEqual(first["duration_seconds"], 1260)
        self.assertEqual(second, first)

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_network_error_falls_back_to_straight_line(self):
        with patch.object(
            routing.requests, "get",
            side_effect=routing.requests.exceptions.ConnectionError("no route to host"),
        ):
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        self.assertIsNotNone(result)
        self.assertEqual(result["source"], "straight_line_estimate")

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real-DO-NOT-LOG-ME")
    def test_network_error_never_logs_the_api_key(self):
        # Regression guard: requests embeds the full request URL (including
        # "key=...") in a RequestException's string form. get_route_eta must
        # never pass str(exc) to the logger, or the live Google Maps key
        # would end up in application logs on every network failure.
        secret = "test-key-not-real-DO-NOT-LOG-ME"
        with patch.object(
            routing.requests, "get",
            side_effect=routing.requests.exceptions.ProxyError(
                f"Tunnel connection failed: 403 Forbidden for url with key={secret}"
            ),
        ):
            with self.assertLogs(routing.logger, level="WARNING") as logs:
                routing.get_route_eta(*self.ORIGIN, *self.DEST)
        joined = "\n".join(logs.output)
        self.assertNotIn(secret, joined)

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_timeout_falls_back_to_straight_line(self):
        with patch.object(
            routing.requests, "get",
            side_effect=routing.requests.exceptions.Timeout("timed out"),
        ):
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        self.assertEqual(result["source"], "straight_line_estimate")

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_top_level_request_denied_falls_back(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "REQUEST_DENIED"}
        mock_resp.raise_for_status.return_value = None
        with patch.object(routing.requests, "get", return_value=mock_resp):
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        self.assertEqual(result["source"], "straight_line_estimate")

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_element_zero_results_falls_back(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "rows": [{"elements": [{"status": "ZERO_RESULTS"}]}],
        }
        mock_resp.raise_for_status.return_value = None
        with patch.object(routing.requests, "get", return_value=mock_resp):
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        self.assertEqual(result["source"], "straight_line_estimate")

    @override_settings(GOOGLE_MAPS_API_KEY="test-key-not-real")
    def test_malformed_response_falls_back(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "OK", "rows": []}
        mock_resp.raise_for_status.return_value = None
        with patch.object(routing.requests, "get", return_value=mock_resp):
            result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        self.assertEqual(result["source"], "straight_line_estimate")

    def test_missing_coordinates_returns_none(self):
        self.assertIsNone(routing.get_route_eta(None, 77.8, 12.75, 77.85))
        self.assertIsNone(routing.get_route_eta(12.7, None, 12.75, 77.85))
        self.assertIsNone(routing.get_route_eta(12.7, 77.8, None, 77.85))
        self.assertIsNone(routing.get_route_eta(12.7, 77.8, 12.75, None))

    @override_settings(GOOGLE_MAPS_API_KEY="")
    def test_straight_line_duration_matches_previous_flat_speed_assumption(self):
        # The code this replaces assumed a flat 25 km/h. Confirm the
        # fallback's assumed speed matches, so removing Maps availability
        # is never worse than the old behavior, only potentially better.
        result = routing.get_route_eta(*self.ORIGIN, *self.DEST)
        expected_minutes = round((result["distance_km"] / 25.0) * 60)
        actual_minutes = round(result["duration_seconds"] / 60.0)
        self.assertEqual(actual_minutes, expected_minutes)
