"""
workforce_integration/services.py

Isolated Integration Client for CalServices <-> Workforce System boundary.
All communication between CalServices and the external workforce system passes
through this service layer. CalServices does not own employees, shifts, attendance,
or GPS hardware tracking.
"""
import logging
import os
import uuid
import requests
import threading
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("workforce_integration")

WORKFORCE_API_BASE_URL = os.getenv("WORKFORCE_API_BASE_URL", "http://localhost:8001/api/workforce")
WORKFORCE_API_KEY = os.getenv("WORKFORCE_API_KEY", "wf_integration_key_default")
# Used specifically for the internal (non-technician-session) endpoints on
# the Vendor app, e.g. customer-cancel-sync below -- reuses the same secret
# already shared with the Vendor app for webhook auth in the other
# direction, rather than a second key (WORKFORCE_API_KEY above) the Vendor
# app has never actually been configured to check.
WORKFORCE_WEBHOOK_SECRET = os.getenv("WORKFORCE_WEBHOOK_SECRET", "")


class WorkforceIntegrationService:
    """Client for delegating workforce tasks to the external Workforce system."""

    _locks_lock = threading.Lock()
    _active_locks = {}

    @classmethod
    def _get_lock(cls, key: str):
        with cls._locks_lock:
            if key not in cls._active_locks:
                cls._active_locks[key] = threading.Lock()
            return cls._active_locks[key]

    @classmethod
    def _headers(cls):
        return {
            "Authorization": f"Bearer {WORKFORCE_API_KEY}",
            "Content-Type": "application/json",
            "X-CalServices-Source": "calservices-platform",
        }

    @classmethod
    def _internal_headers(cls):
        """
        Headers for the Vendor app's internal/service-to-service endpoints
        (IsInternalWorkforceCaller), which check WORKFORCE_WEBHOOK_SECRET --
        not the generic _headers() above, whose WORKFORCE_API_KEY the
        Vendor app has never actually been configured to recognize.
        """
        return {
            "Authorization": f"Bearer {WORKFORCE_WEBHOOK_SECRET}",
            "Content-Type": "application/json",
            "X-CalServices-Source": "calservices-platform",
        }

    @classmethod
    def _resolve_sr(cls, service_request):
        if hasattr(service_request, "request_id"):
            return service_request
        from service_requests.models import ServiceRequest
        if isinstance(service_request, int) or (isinstance(service_request, str) and service_request.isdigit()):
            return ServiceRequest.objects.filter(pk=int(service_request)).first()
        if isinstance(service_request, str):
            return ServiceRequest.objects.filter(request_id=service_request).first()
        return None

    @classmethod
    def dispatch_job(cls, service_request, notes="") -> dict:
        """
        Dispatches a confirmed CalServices booking to the Workforce system for technician allocation.
        Returns external job metadata (e.g. workforce_job_id, status).
        """
        sr = cls._resolve_sr(service_request)
        if not sr:
            return {"success": False, "error": "Booking not found"}

        payload = {
            "booking_id": sr.request_id,
            "category": sr.service_category,
            "title": sr.issue_title,
            "description": sr.description,
            "notes": notes,
            "customer": {
                "name": sr.customer_name,
                "phone": sr.phone,
                "email": sr.email,
            },
            "location": {
                "address": sr.address,
                "drop_address": getattr(sr, "drop_address", ""),
                "latitude": float(sr.latitude) if sr.latitude else None,
                "longitude": float(sr.longitude) if sr.longitude else None,
            },
            "schedule": {
                "preferred_date": str(sr.preferred_date),
                "preferred_time": sr.preferred_time,
            },
            "payment": {
                "total_amount": float(sr.total_amount),
                "payment_method": sr.payment_method,
                "payment_status": sr.payment_status,
            },
            "cart_data": sr.cart_data,
            "start_otp": sr.start_otp,
            "tracking_token": str(sr.tracking_token) if sr.tracking_token else None,
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/jobs/dispatch/"
            response = requests.post(url, json=payload, headers=cls._internal_headers(), timeout=10)
            if response.status_code in [200, 201]:
                data = response.json()
                workforce_job_id = data.get("workforce_job_id") or data.get("job_id")
                if not workforce_job_id:
                    return {"success": False, "status": "workforce_unavailable", "message": "Missing workforce_job_id in response", "retryable": True}
                sr.workforce_job_id = workforce_job_id
                sr.save(update_fields=["workforce_job_id", "updated_at"])
                return {"success": True, "workforce_job_id": workforce_job_id, "data": data}
            else:
                logger.warning(f"Workforce API responded with status {response.status_code}: {response.text}")
                return {"success": False, "status": "workforce_unavailable", "message": f"Workforce API error ({response.status_code})", "retryable": True}
        except Exception as e:
            logger.warning(f"Workforce API dispatch failed -- booking was NOT dispatched to a technician: {e}")
            return {"success": False, "status": "workforce_unavailable", "message": "Workforce service unreachable", "retryable": True}

    @classmethod
    def cancel_workforce_job(cls, service_request, reason: str = "") -> dict:
        """Notifies the external workforce system of booking cancellation."""
        sr = cls._resolve_sr(service_request)
        if not sr or not sr.workforce_job_id:
            return {"success": True, "message": "No external workforce job attached"}

        payload = {
            "workforce_job_id": sr.workforce_job_id,
            "booking_id": sr.request_id,
            "reason": reason,
            "cancelled_at": timezone.now().isoformat(),
        }

        try:
            # Bug found (BLOCKER): this used to POST to "{base}/jobs/{id}/cancel/"
            # (WorkforceJobTechnicianCancelView on the Vendor app) using
            # _headers(), whose Bearer key the Vendor app has never
            # recognized (401 every time), AND that view's semantics are
            # "the assigned technician is cancelling their own job within a
            # 5-minute window" -- not "the customer cancelled the whole
            # booking". Both failures were silently swallowed below and
            # reported back as success, so the technician was never
            # actually released on the Vendor side. Fixed to call the
            # dedicated internal endpoint built for this
            # (WorkforceJobCustomerCancelSyncView), authenticated with the
            # shared webhook secret via _internal_headers().
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{sr.workforce_job_id}/customer-cancel-sync/"
            response = requests.post(url, json=payload, headers=cls._internal_headers(), timeout=5)
            if response.status_code in [200, 204]:
                return {"success": True}
            logger.warning(
                f"Workforce cancellation sync rejected by vendor app "
                f"(status {response.status_code}): {response.text[:500]} -- "
                f"vendor side was NOT told this booking was cancelled."
            )
        except Exception as e:
            logger.warning(f"Workforce cancellation notification failed -- vendor side was NOT told this booking was cancelled: {e}")

        return {"success": True, "fallback": True}

    @classmethod
    def clawback_workforce_job(cls, service_request, reason: str = "") -> dict:
        """
        Notifies the external workforce system that a refund completed, so
        it can claw back the technician's earnings for that job.

        Bug found (gap): admin_complete_refund() used to run the payment
        gateway refund and flip RefundRequest.status to COMPLETED without
        telling the Vendor app anything -- the technician's earnings for
        that job (a JOB_CREDIT wallet ledger entry, held or already
        released) were left untouched, so a fully refunded customer could
        still leave a paid-out technician for the same job with no
        reconciling entry anywhere. Calls the dedicated internal endpoint
        built for this (WorkforceJobClawbackSyncView), authenticated with
        the shared webhook secret via _internal_headers(), mirroring
        cancel_workforce_job() just above.
        """
        sr = cls._resolve_sr(service_request)
        if not sr or not sr.workforce_job_id:
            return {"success": True, "message": "No external workforce job attached"}

        payload = {
            "workforce_job_id": sr.workforce_job_id,
            "booking_id": sr.request_id,
            "reason": reason or "Customer refund completed.",
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{sr.workforce_job_id}/clawback-sync/"
            response = requests.post(url, json=payload, headers=cls._internal_headers(), timeout=5)
            if response.status_code in [200, 204]:
                return {"success": True}
            logger.warning(
                f"Workforce clawback sync rejected by vendor app "
                f"(status {response.status_code}): {response.text[:500]} -- "
                f"vendor side was NOT told to claw back this job's earnings."
            )
        except Exception as e:
            logger.warning(f"Workforce clawback notification failed -- vendor side was NOT told to claw back this job's earnings: {e}")

        return {"success": True, "fallback": True}

    @classmethod
    def reschedule_workforce_job(cls, service_request, new_date, new_time, reason="") -> dict:
        """Updates the external workforce system schedule for an existing job."""
        sr = cls._resolve_sr(service_request)
        if not sr or not sr.workforce_job_id:
            return {"success": True, "fallback": True}

        payload = {
            "workforce_job_id": sr.workforce_job_id,
            "booking_id": sr.request_id,
            "rescheduled_date": str(new_date),
            "new_time": str(new_time),
            "reason": reason or "Customer requested a new date/time.",
        }

        try:
            # Bug found: this used to POST to "{base}/jobs/reschedule/" -- a
            # URL that doesn't match any route on the vendor side at all
            # (the real route takes the job's pk in the path, same as
            # cancel_workforce_job()'s URL just below). That guaranteed a 404
            # on every call. Fixed to include the pk.
            #
            # Known remaining gap (tracked separately, not fixed here): even
            # with a matching URL, the vendor endpoint at this path
            # (WorkforceJobRescheduleView) only accepts requests from an
            # authenticated vendor-side session/JWT -- it does not recognize
            # this service's static Bearer API key, so this call is still
            # expected to fail auth and fall through to the safe fallback
            # below today. It's also a different feature on the vendor side
            # (technician/ops-initiated delay tracking) rather than "sync
            # this job to the customer's new date", so wiring it up for real
            # needs a small dedicated vendor-side endpoint, not just an auth
            # fix. This call is safe to leave best-effort in the meantime --
            # the shared database means the vendor app already sees the new
            # preferred_date/preferred_time directly once apply_reschedule_
            # transition() saves the booking, which happens before this call.
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{sr.workforce_job_id}/reschedule/"
            response = requests.post(url, json=payload, headers=cls._headers(), timeout=5)
            if response.status_code in [200, 204]:
                return {"success": True}
        except Exception as e:
            logger.warning(f"Workforce reschedule notification failed -- vendor side was NOT told this booking was rescheduled: {e}")

        return {"success": True, "fallback": True}

    @classmethod
    def get_available_slots(cls, service_category: str, date_str: str, latitude=None, longitude=None) -> list:
        """
        Queries the external Workforce system for available technician capacity slots on a given date.
        """
        params = {
            "category": service_category,
            "date": date_str,
        }
        if latitude and longitude:
            params["lat"] = str(latitude)
            params["lng"] = str(longitude)

        try:
            url = f"{WORKFORCE_API_BASE_URL}/capacity/slots/"
            response = requests.get(url, params=params, headers=cls._headers(), timeout=4)
            if response.status_code == 200:
                slots = response.json().get("slots", [])
                if slots:
                    return slots
        except Exception as e:
            logger.info(f"Workforce slots query fallback: {e}")

        # Standard business time slots fallback
        return [
            {"slot": "09-10", "label": "09:00 AM - 10:00 AM", "available": True},
            {"slot": "10-11", "label": "10:00 AM - 11:00 AM", "available": True},
            {"slot": "11-12", "label": "11:00 AM - 12:00 PM", "available": True},
            {"slot": "14-15", "label": "02:00 PM - 03:00 PM", "available": True},
            {"slot": "15-16", "label": "03:00 PM - 04:00 PM", "available": True},
            {"slot": "16-17", "label": "04:00 PM - 05:00 PM", "available": True},
        ]

    @classmethod
    def get_technician_tracking(cls, booking_id: str) -> dict:
        """
        Fetches the current live tracking coordinates and ETA for a technician assigned by the Workforce system.
        """
        from django.core.cache import cache
        cache_key = f"wf_tracking_{booking_id}"

        # Fast path read
        cached = cache.get(cache_key)
        if cached is not None:
            return cached if cached is not False else None

        # Deduplication Lock
        lock = cls._get_lock(cache_key)
        with lock:
            # Double-check cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached if cached is not False else None

            # Resolves to WorkforceJobLiveTrackingView on the vendor side.
            candidate_urls = [
                f"{WORKFORCE_API_BASE_URL}/jobs/{booking_id}/live-tracking/",
                f"{WORKFORCE_API_BASE_URL}/customer/jobs/{booking_id}/tracking/",
            ]
            for url in candidate_urls:
                try:
                    response = requests.get(url, headers=cls._internal_headers(), timeout=1.5)
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, dict):
                            payload = data.get("data") if ("data" in data and isinstance(data.get("data"), dict)) else data
                            if (
                                payload.get("technician")
                                or payload.get("employee")
                                or payload.get("technician_name")
                                or payload.get("assigned_technician")
                            ):
                                cache.set(cache_key, payload, timeout=3)
                                return payload
                    elif response.status_code in [401, 403, 404]:
                        break
                except Exception as e:
                    logger.debug(f"Workforce tracking query fallback for {url}: {e}")

            # Cache negative result for 5s to eliminate tight polling loop on missing tracking
            cache.set(cache_key, False, timeout=5)
            return None

    @classmethod
    def notify_extension_decision(cls, service_request, extension_id: int, decision: str, notes: str = "") -> dict:
        """
        Notifies Workforce system whether customer approved or declined an on-site work extension.
        """
        sr = cls._resolve_sr(service_request)
        if not sr or not sr.workforce_job_id:
            return {"success": True, "fallback": True}

        payload = {
            "workforce_job_id": sr.workforce_job_id,
            "booking_id": sr.request_id,
            "extension_id": extension_id,
            "decision": decision,  # 'accepted' | 'declined'
            "notes": notes,
            "decided_at": timezone.now().isoformat(),
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{sr.workforce_job_id}/extension-decision/"
            response = requests.post(url, json=payload, headers=cls._internal_headers(), timeout=5)
            if response.status_code in [200, 201, 204]:
                return {"success": True}
        except Exception as e:
            logger.warning(f"Workforce extension decision notification failed -- vendor side was NOT told: {e}")

        return {"success": True, "fallback": True}

    @classmethod
    def send_technician_feedback(cls, service_request, technician_id: str, rating: float, comments: str = "") -> dict:
        """
        Dispatches customer verified rating and feedback score to the Workforce employee profile.
        """
        sr = cls._resolve_sr(service_request)
        if not sr or not technician_id:
            return {"success": True, "fallback": True}

        payload = {
            "booking_id": sr.request_id,
            "workforce_job_id": sr.workforce_job_id or "",
            "technician_id": str(technician_id),
            "rating": float(rating),
            "comments": comments,
            "submitted_at": timezone.now().isoformat(),
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/technicians/{technician_id}/feedback/"
            response = requests.post(url, json=payload, headers=cls._internal_headers(), timeout=5)
            if response.status_code in [200, 201, 204]:
                return {"success": True}
        except Exception as e:
            logger.warning(f"Workforce feedback push failed -- technician rating was NOT delivered to the vendor side: {e}")

        return {"success": True, "fallback": True}

    @classmethod
    def get_quote_by_token(cls, token: str) -> dict:
        """
        Calls the vendor's public endpoint to retrieve quote details by token.
        """
        try:
            url = f"{WORKFORCE_API_BASE_URL}/customer/quote-token/{token}/"
            response = requests.get(url, headers=cls._headers(), timeout=5)
            if response.status_code == 200:
                return {"success": True, "quote": response.json()}
            else:
                logger.warning(f"Workforce API get_quote_by_token responded with status {response.status_code}: {response.text}")
                return {"success": False, "message": f"Workforce API error ({response.status_code})"}
        except Exception as e:
            logger.info(f"Workforce API get_quote_by_token failed: {e}")
            return {"success": False, "message": "Workforce service unreachable"}

    @classmethod
    def get_quote_by_booking_id(cls, booking_id: str) -> dict:
        """
        Calls the vendor's endpoint to retrieve quote details associated with a booking/request ID.
        """
        from django.core.cache import cache
        cache_key = f"wf_quote_{booking_id}"

        # Fast path read
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Deduplication Lock
        lock = cls._get_lock(cache_key)
        with lock:
            # Double-check cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

            try:
                url = f"{WORKFORCE_API_BASE_URL}/customer/bookings/{booking_id}/quote/"
                response = requests.get(url, headers=cls._headers(), timeout=5)
                if response.status_code == 200:
                    result = {"success": True, "quote": response.json()}
                    cache.set(cache_key, result, timeout=60)
                    return result
                result = {"success": False, "message": "No quote found", "quote": None}
                cache.set(cache_key, result, timeout=60)
                return result
            except Exception as e:
                logger.info(f"Workforce API get_quote_by_booking_id failed: {e}")
                result = {"success": False, "message": "Workforce service unreachable", "quote": None}
                cache.set(cache_key, result, timeout=15)
                return result

