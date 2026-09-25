"""
workforce_integration/services.py

Isolated Integration Client for CalServices <-> Workforce System boundary.
All communication between CalServices and the external workforce system passes
through this service layer. CalServices does not own employees, shifts, attendance,
or GPS hardware tracking.
"""
import logging
import os
import sys
import uuid
import requests
import threading
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("workforce_integration")

_raw_base_url = getattr(settings, "WORKFORCE_API_BASE_URL", None) or os.getenv("WORKFORCE_API_BASE_URL")
_raw_webhook_secret = getattr(settings, "WORKFORCE_WEBHOOK_SECRET", None) or os.getenv("WORKFORCE_WEBHOOK_SECRET")

if not _raw_base_url or not _raw_webhook_secret:
    if settings.DEBUG or "test" in sys.argv or getattr(settings, "TESTING", False):
        WORKFORCE_API_BASE_URL = (_raw_base_url or "http://localhost:8001/api/workforce").rstrip("/")
        WORKFORCE_WEBHOOK_SECRET = _raw_webhook_secret or "dev-insecure-workforce-webhook-secret-local-testing-only"
        logger.warning(
            "WORKFORCE_API_BASE_URL / WORKFORCE_WEBHOOK_SECRET is not fully configured in environment. "
            "Using DEBUG-only fallback values. Set both variables in production before deploying."
        )
    else:
        raise ValueError(
            "CRITICAL CONFIGURATION ERROR: WORKFORCE_API_BASE_URL and WORKFORCE_WEBHOOK_SECRET "
            "environment variables are mandatory in production (DEBUG=False)."
        )
else:
    WORKFORCE_API_BASE_URL = _raw_base_url.rstrip("/")
    WORKFORCE_WEBHOOK_SECRET = _raw_webhook_secret.strip()


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
    def _internal_headers(cls):
        """
        Headers for all internal/service-to-service endpoints on the Vendor app,
        authenticated via shared WORKFORCE_WEBHOOK_SECRET.
        """
        return {
            "Authorization": f"Bearer {WORKFORCE_WEBHOOK_SECRET}",
            "X-Workforce-Webhook-Secret": WORKFORCE_WEBHOOK_SECRET,
            "Content-Type": "application/json",
            "X-CalServices-Source": "calservices-platform",
        }

    @classmethod
    def _headers(cls):
        """Alias to _internal_headers to ensure all calls pass verified shared authentication."""
        return cls._internal_headers()

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

        # Extract logistics vehicle / fitment requirements if present
        logistics_info = None
        tier = getattr(sr, "logistics_tier", None)
        if tier:
            v_class = getattr(tier, "vehicle_class", "") or (tier.get_vehicle_class() if hasattr(tier, "get_vehicle_class") else "")
            max_wt = float(tier.get_max_weight_kg()) if hasattr(tier, "get_max_weight_kg") and tier.get_max_weight_kg() > 0 else (float(tier.max_weight_kg) if getattr(tier, "max_weight_kg", None) else None)
            max_vol = float(tier.get_max_cft()) if hasattr(tier, "get_max_cft") and tier.get_max_cft() > 0 else (float(tier.max_cft) if getattr(tier, "max_cft", None) else None)
            logistics_info = {
                "tier_id": tier.id,
                "tier_slug": tier.slug,
                "tier_name": tier.name,
                "vehicle_class": v_class,
                "max_weight_kg": max_wt,
                "max_cft": max_vol,
                "category": getattr(tier, "category", ""),
            }

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
                "drop_latitude": float(sr.drop_latitude) if getattr(sr, "drop_latitude", None) else None,
                "drop_longitude": float(sr.drop_longitude) if getattr(sr, "drop_longitude", None) else None,
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
            "logistics": logistics_info,
            "vehicle_class": logistics_info.get("vehicle_class") if logistics_info else None,
            "vehicle_type": logistics_info.get("vehicle_class") if logistics_info else None,
            "logistics_tier_id": tier.id if tier else None,
        }

        # Guard against unmocked live network requests during test runs (avoids polluting running dev servers)
        if getattr(settings, "TESTING", False):
            is_mocked = hasattr(requests.post, "mock_calls") or hasattr(requests.post, "assert_called")
            if not is_mocked:
                return {
                    "success": False,
                    "status": "workforce_unavailable",
                    "message": "Workforce service unreachable in test mode",
                    "retryable": True,
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
        if not sr:
            return {"success": True, "message": "No service request resolved"}

        wf_pk = None
        if getattr(sr, "workforce_job_id", None):
            try:
                wf_pk = int(str(sr.workforce_job_id).replace("WF-", "").replace("WFJ-", ""))
            except (ValueError, TypeError):
                wf_pk = None
        if not wf_pk and getattr(sr, "id", None):
            wf_pk = sr.id

        if not wf_pk:
            return {"success": True, "message": "No external workforce job attached"}

        payload = {
            "workforce_job_id": wf_pk,
            "booking_id": sr.request_id,
            "reason": reason,
            "cancelled_at": timezone.now().isoformat(),
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{wf_pk}/customer-cancel-sync/"
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
        """
        sr = cls._resolve_sr(service_request)
        if not sr:
            return {"success": True, "message": "No service request resolved"}

        wf_pk = None
        if getattr(sr, "workforce_job_id", None):
            try:
                wf_pk = int(str(sr.workforce_job_id).replace("WF-", "").replace("WFJ-", ""))
            except (ValueError, TypeError):
                wf_pk = None
        if not wf_pk and getattr(sr, "id", None):
            wf_pk = sr.id

        if not wf_pk:
            return {"success": True, "message": "No external workforce job attached"}

        payload = {
            "workforce_job_id": wf_pk,
            "booking_id": sr.request_id,
            "reason": reason or "Customer refund completed.",
        }

        try:
            url = f"{WORKFORCE_API_BASE_URL}/jobs/{wf_pk}/clawback-sync/"
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
    def _build_quote_dict_from_db(cls, quote_id: int) -> dict:
        """
        Dynamically builds a comprehensive quote dictionary with items and measurements from PostgreSQL.
        """
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM workforce_quote WHERE id = %s", [quote_id])
                cols = [c[0] for c in cursor.description]
                row = cursor.fetchone()
                if not row:
                    return None
                q = dict(zip(cols, row))

                cursor.execute("""
                    SELECT * FROM workforce_quote_item 
                    WHERE quote_id = %s 
                    ORDER BY sort_order ASC, id ASC
                """, [quote_id])
                item_cols = [c[0] for c in cursor.description]
                items = [dict(zip(item_cols, r)) for r in cursor.fetchall()]

                cursor.execute("""
                    SELECT * FROM workforce_quote_measurement 
                    WHERE quote_id = %s 
                    ORDER BY id ASC
                """, [quote_id])
                meas_cols = [c[0] for c in cursor.description]
                meas = [dict(zip(meas_cols, r)) for r in cursor.fetchall()]

                total_area = sum(float(m.get("area") or 0) for m in meas)
                adv_pct = float(q.get("advance_percent") or 0)
                tot_amt = float(q.get("total_amount") or 0)
                adv_amt = round((tot_amt * adv_pct / 100.0), 2) if adv_pct > 0 else 0.0

                q_num = q.get("quote_number") or ""
                v_num = q.get("quote_version") or 1
                display_q_num = f"{q_num}-V{v_num}" if (v_num > 1 and f"-V{v_num}" not in q_num and f"-v{v_num}" not in q_num) else q_num

                return {
                    "quote_id": q["id"],
                    "quote_number": display_q_num,
                    "raw_quote_number": q_num,
                    "version": v_num,
                    "quote_version": v_num,
                    "title": q.get("title") or "",
                    "description": q.get("description") or "",
                    "service_category": q.get("service_category") or "",
                    "service_name": q.get("service_name") or "",
                    "status": q.get("status") or "SENT_TO_CUSTOMER",
                    "customer_decision": q.get("customer_decision") or "",
                    "customer_notes": q.get("customer_notes") or "",
                    "customer_decline_reason": q.get("customer_decline_reason") or "",
                    "subtotal": float(q.get("subtotal_amount") or 0),
                    "subtotal_amount": float(q.get("subtotal_amount") or 0),
                    "discount_amount": float(q.get("discount_amount") or 0),
                    "tax_amount": float(q.get("tax_amount") or 0),
                    "total_amount": tot_amt,
                    "grand_total": tot_amt,
                    "net_payable": float(q.get("net_payable") or tot_amt),
                    "inspection_fee": float(q.get("inspection_fee") or 0),
                    "inspection_fee_adjusted": float(q.get("inspection_fee_adjusted") or 0),
                    "advance_percent": adv_pct,
                    "advance_amount": adv_amt,
                    "balance_amount": round(tot_amt - adv_amt, 2) if adv_amt > 0 else tot_amt,
                    "valid_until": q["valid_until"].isoformat() if q.get("valid_until") else None,
                    "decision_token": q.get("decision_token"),
                    "decision_expires_at": q["decision_expires_at"].isoformat() if q.get("decision_expires_at") else None,
                    "total_area": total_area,
                    "total_paintable_area": total_area,
                    "items": [
                        {
                            "id": it["id"],
                            "name": it.get("name") or it.get("description") or "Quotation Item",
                            "service_name": it.get("name") or "Quotation Item",
                            "description": it.get("description") or "",
                            "section": it.get("section") or "",
                            "item_type": it.get("item_type") or "item",
                            "quantity": float(it.get("quantity") or 1),
                            "unit": it.get("unit") or "sqft",
                            "unit_price": float(it.get("unit_price") or 0),
                            "rate": float(it.get("unit_price") or 0),
                            "final_rate": float(it.get("unit_price") or 0),
                            "tax_rate": float(it.get("tax_rate") or 0),
                            "discount_amount": float(it.get("discount_amount") or 0),
                            "total_amount": float(it.get("total_amount") or 0),
                            "amount": float(it.get("total_amount") or 0),
                            "line_total": float(it.get("total_amount") or 0),
                            "warranty_applicable": bool(it.get("warranty_applicable")),
                            "warranty_tier": it.get("warranty_tier") or "",
                        }
                        for it in items
                    ],
                    "measurements": [
                        {
                            "id": m["id"],
                            "name": m.get("name") or f"Area #{m['id']}",
                            "area_name": m.get("name") or f"Area #{m['id']}",
                            "measurement_type": m.get("measurement_type") or "area",
                            "length": float(m["length"]) if m.get("length") is not None else None,
                            "width": float(m["width"]) if m.get("width") is not None else None,
                            "height": float(m["height"]) if m.get("height") is not None else None,
                            "calculated_area": float(m.get("area") or 0),
                            "final_area": float(m.get("area") or 0),
                            "area": float(m.get("area") or 0),
                            "quantity": float(m.get("quantity") or 1),
                            "unit": m.get("unit") or "sqft",
                            "notes": m.get("notes") or "",
                        }
                        for m in meas
                    ]
                }
        except Exception as e:
            logger.error(f"Error building quote dict from db for quote {quote_id}: {e}")
            return None

    @classmethod
    def get_quote_history_by_booking_id(cls, booking_id) -> list:
        """
        Retrieves all quotation versions / history associated with a booking/request ID.
        """
        if not booking_id:
            return []

        try:
            if hasattr(booking_id, "request_id"):
                sr_id = booking_id.id
                req_id = booking_id.request_id
                wf_id = getattr(booking_id, "workforce_job_id", -1) or -1
            elif isinstance(booking_id, int) or (isinstance(booking_id, str) and booking_id.isdigit()):
                sr_id = int(booking_id)
                req_id = str(booking_id)
                wf_id = -1
            else:
                sr_id = -1
                req_id = str(booking_id)
                wf_id = -1

            if isinstance(wf_id, str):
                try:
                    wf_id = int(wf_id.replace("WF-", "").replace("WFJ-", ""))
                except ValueError:
                    wf_id = -1
            elif not isinstance(wf_id, int):
                wf_id = -1

            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id FROM workforce_quote 
                    WHERE job_id IN (%s, %s)
                       OR quote_number = %s
                       OR quote_number LIKE %s
                    ORDER BY id ASC
                """, [sr_id, wf_id, req_id, f"{req_id}%"])
                rows = cursor.fetchall()
                quotes = []
                for r in rows:
                    q_dict = cls._build_quote_dict_from_db(r[0])
                    if q_dict:
                        quotes.append(q_dict)
                return quotes
        except Exception as e:
            logger.error(f"Error fetching quote history for booking {booking_id}: {e}")
            return []

    @classmethod
    def get_quote_by_token(cls, token: str) -> dict:
        """
        Retrieves quote details by public decision token or quote number.
        """
        if not token:
            return {"success": False, "message": "No token provided"}

        # 1. DB Lookup first
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id FROM workforce_quote 
                    WHERE decision_token = %s 
                       OR quote_number = %s 
                       OR quote_number LIKE %s
                    ORDER BY 
                      CASE 
                        WHEN status = 'SENT_TO_CUSTOMER' THEN 1
                        WHEN status IN ('CUSTOMER_ACCEPTED', 'APPROVED', 'CONVERTED') THEN 2
                        WHEN status IN ('CHANGES_REQUESTED', 'CHANGE_REQUESTED') THEN 3
                        WHEN status IN ('DECLINED', 'CUSTOMER_DECLINED') THEN 4
                        WHEN status = 'DRAFT' THEN 5
                        ELSE 6
                      END ASC,
                      updated_at DESC, id DESC LIMIT 1
                """, [str(token), str(token), f"{str(token).split('-V')[0]}%"])
                row = cursor.fetchone()
                if row and row[0]:
                    quote_dict = cls._build_quote_dict_from_db(row[0])
                    if quote_dict:
                        return {"success": True, "quote": quote_dict}
        except Exception as ex:
            logger.debug(f"DB get_quote_by_token lookup failed: {ex}")

        # 2. HTTP Fallback

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
    def get_quote_by_booking_id(cls, booking_id: str, allow_http: bool = True) -> dict:
        """
        Retrieves active quote details associated with a booking/request ID.
        Dynamically queries PostgreSQL with priority for active sent/accepted quotes,
        and falls back to external HTTP APIs.
        """
        if not booking_id:
            return {"success": False, "message": "No booking ID provided", "quote": None}

        from django.core.cache import cache
        booking_key = getattr(booking_id, "request_id", None) or getattr(booking_id, "id", None) or str(booking_id)
        cache_key = f"wf_quote_{booking_key}"

        # Fast path read
        cached = cache.get(cache_key)
        if cached is not None and cached.get("quote") is not None:
            return cached

        # Deduplication Lock
        lock = cls._get_lock(cache_key)
        with lock:
            cached = cache.get(cache_key)
            if cached is not None and cached.get("quote") is not None:
                return cached

            # 1. Dynamic query directly in PostgreSQL
            try:
                if hasattr(booking_id, "request_id"):
                    sr_id = booking_id.id
                    req_id = booking_id.request_id
                    wf_id = getattr(booking_id, "workforce_job_id", -1) or -1
                elif isinstance(booking_id, int) or (isinstance(booking_id, str) and booking_id.isdigit()):
                    sr_id = int(booking_id)
                    req_id = str(booking_id)
                    wf_id = -1
                else:
                    sr_id = -1
                    req_id = str(booking_id)
                    wf_id = -1

                if isinstance(wf_id, str):
                    try:
                        wf_id = int(wf_id.replace("WF-", "").replace("WFJ-", ""))
                    except ValueError:
                        wf_id = -1
                elif not isinstance(wf_id, int):
                    wf_id = -1

                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT id FROM workforce_quote 
                        WHERE job_id IN (%s, %s)
                           OR quote_number = %s
                           OR quote_number LIKE %s
                        ORDER BY 
                          CASE 
                            WHEN status = 'SENT_TO_CUSTOMER' THEN 1
                            WHEN status IN ('CUSTOMER_ACCEPTED', 'APPROVED', 'CONVERTED') THEN 2
                            WHEN status IN ('CHANGES_REQUESTED', 'CHANGE_REQUESTED') THEN 3
                            WHEN status IN ('DECLINED', 'CUSTOMER_DECLINED') THEN 4
                            WHEN status = 'DRAFT' THEN 5
                            ELSE 6
                          END ASC,
                          updated_at DESC,
                          id DESC
                        LIMIT 1
                    """, [sr_id, wf_id, req_id, f"{req_id}%"])
                    row = cursor.fetchone()
                    if row and row[0]:
                        quote_dict = cls._build_quote_dict_from_db(row[0])
                        if quote_dict:
                            result = {"success": True, "quote": quote_dict}
                            cache.set(cache_key, result, timeout=5)
                            return result
            except Exception as db_err:
                logger.debug(f"Direct DB quote query failed, falling back to HTTP: {db_err}")

            if not allow_http:
                result = {"success": False, "message": "No quote found", "quote": None}
                cache.set(cache_key, result, timeout=10)
                return result

            # 2. HTTP Fallback to Vendor API
            candidate_urls = [
                f"{WORKFORCE_API_BASE_URL}/customer/bookings/{booking_id}/quote/",
                f"{WORKFORCE_API_BASE_URL}/customer/jobs/{booking_id}/quote/",
                f"{WORKFORCE_API_BASE_URL}/jobs/{booking_id}/quote/",
            ]

            for url in candidate_urls:
                try:
                    response = requests.get(url, headers=cls._headers(), timeout=1.0)
                    if response.status_code == 200:
                        quote_json = response.json()
                        if quote_json and isinstance(quote_json, dict):
                            # If the vendor returned { "has_quote": False, ... } or { "quote": None }
                            if quote_json.get("has_quote") is False:
                                quote_json = None
                            elif quote_json.get("quote") and isinstance(quote_json.get("quote"), dict):
                                quote_json = quote_json.get("quote")

                            # Verify quote_json is an actual quote (has quote_number, id, quote_id, or items)
                            if quote_json and isinstance(quote_json, dict):
                                has_valid_identifier = bool(quote_json.get("quote_number") or quote_json.get("id") or quote_json.get("quote_id") or quote_json.get("items"))
                                if not has_valid_identifier:
                                    quote_json = None

                            if quote_json and isinstance(quote_json, dict):
                                # Ensure decision_token is attached if missing from vendor JSON
                                if not quote_json.get("decision_token"):
                                    quote_num = str(quote_json.get("quote_number") or "").strip()
                                    if quote_num:
                                        try:
                                            from django.db import connection
                                            with connection.cursor() as cursor:
                                                cursor.execute("""
                                                    SELECT decision_token, customer_notes, customer_decline_reason, status 
                                                    FROM workforce_quote 
                                                    WHERE quote_number = %s 
                                                       OR quote_number LIKE %s 
                                                       OR job_id = %s 
                                                       OR id = %s
                                                    ORDER BY id DESC LIMIT 1
                                                """, [
                                                    quote_num,
                                                    f"{quote_num.split('-V')[0]}%",
                                                    int(booking_id) if str(booking_id).isdigit() else -1,
                                                    int(quote_json.get("quote_id") or -1) if str(quote_json.get("quote_id") or "").isdigit() else -1
                                                ])
                                                row = cursor.fetchone()
                                                if row and row[0]:
                                                    quote_json["decision_token"] = row[0]
                                                    if not quote_json.get("customer_notes") and row[1]:
                                                        quote_json["customer_notes"] = row[1]
                                                    if not quote_json.get("customer_decline_reason") and row[2]:
                                                        quote_json["customer_decline_reason"] = row[2]
                                        except Exception as d_err:
                                            logger.debug(f"Could not enrich decision_token for quote: {d_err}")

                                result = {"success": True, "quote": quote_json}
                                cache.set(cache_key, result, timeout=5)
                                return result
                except Exception as e:
                    logger.debug(f"Workforce API get_quote_by_booking_id failed on {url}: {e}")

            result = {"success": False, "message": "No quote found", "quote": None}
            cache.set(cache_key, result, timeout=2)
            return result

    @classmethod
    def decide_quote(cls, token: str, decision: str, data: dict = None) -> dict:
        """
        Submits customer decision (ACCEPT, REQUEST_CHANGES, DECLINE) to the workforce system.
        Auto-resolves decision_token from database if a quote_number, quote_id, or booking_id was passed.
        """
        resolved_token = token
        quote_id_val = None
        job_id_val = None
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT decision_token, id, job_id 
                    FROM workforce_quote 
                    WHERE decision_token = %s 
                       OR quote_number = %s 
                       OR quote_number LIKE %s 
                       OR id = %s 
                       OR job_id = %s
                    ORDER BY 
                      CASE 
                        WHEN status = 'SENT_TO_CUSTOMER' THEN 1
                        ELSE 2
                      END ASC,
                      updated_at DESC, id DESC LIMIT 1
                """, [
                    str(token),
                    str(token),
                    f"{str(token).split('-V')[0]}%",
                    int(token) if str(token).isdigit() else -1,
                    int(token) if str(token).isdigit() else -1
                ])
                row = cursor.fetchone()
                if row:
                    if row[0]:
                        resolved_token = row[0]
                    quote_id_val = row[1]
                    job_id_val = row[2]
        except Exception as ex:
            logger.debug(f"Auto-resolving decision_token for {token} skipped: {ex}")

        # Invalidate quote caches
        from django.core.cache import cache
        for k in [f"wf_quote_{token}", f"wf_quote_{resolved_token}", f"wf_quote_{job_id_val}"]:
            cache.delete(k)

        norm_action = "ACCEPT" if decision in ["CUSTOMER_ACCEPTED", "ACCEPT", "APPROVED"] else ("REQUEST_CHANGES" if decision in ["CHANGE_REQUESTED", "REQUESTED_CHANGES", "REQUEST_CHANGES"] else "DECLINE")
        norm_status = "CUSTOMER_ACCEPTED" if norm_action == "ACCEPT" else ("CHANGES_REQUESTED" if norm_action == "REQUEST_CHANGES" else "DECLINED")
        notes_val = (data or {}).get("reason_notes") or (data or {}).get("notes") or (data or {}).get("customer_notes") or ""
        reason_val = (data or {}).get("reason_code") or (data or {}).get("reason") or (data or {}).get("decline_reason") or ""

        payload = {
            "action": norm_action,
            "decision": decision,
            "notes": notes_val,
            "customer_notes": notes_val,
            "reason": reason_val,
            "reason_code": reason_val,
            "reason_notes": notes_val,
        }
        # Avoid self-deadlock if WORKFORCE_API_BASE_URL points to the same Django instance
        is_self_host = bool(
            not WORKFORCE_API_BASE_URL
            or "localhost:8000" in WORKFORCE_API_BASE_URL
            or "127.0.0.1:8000" in WORKFORCE_API_BASE_URL
        )

        candidate_urls = [] if is_self_host else [
            f"{WORKFORCE_API_BASE_URL}/customer/quote-token/{resolved_token}/decide/",
            f"{WORKFORCE_API_BASE_URL}/customer/quotes/{resolved_token}/decide/",
            f"{WORKFORCE_API_BASE_URL}/customer/quote-token/{resolved_token}/decision/",
            f"{WORKFORCE_API_BASE_URL}/workforce/quotes/decision/{resolved_token}/",
            f"{WORKFORCE_API_BASE_URL}/customer/quote-token/{token}/decide/",
        ]
        http_success = False
        res_json = {}
        for url in candidate_urls:
            try:
                response = requests.post(url, json=payload, headers=cls._headers(), timeout=1.5)
                if response.status_code in [200, 201, 204]:
                    res_json = response.json() if response.content else {}
                    http_success = True
                    break
            except (requests.ConnectionError, requests.Timeout) as conn_err:
                logger.debug(f"Workforce endpoint unreachable ({url}): {conn_err}")
                break
            except Exception as e:
                logger.warning(f"Workforce quote decision failed for {url}: {e}")

        # Sync update in DB directly to ensure zero latency and state consistency
        qnum_val = None
        qtotal_val = None
        if quote_id_val:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE workforce_quote 
                        SET status = %s,
                            customer_decision = %s,
                            customer_decided_at = NOW(),
                            customer_notes = CASE WHEN %s != '' THEN %s ELSE customer_notes END,
                            customer_decline_reason = CASE WHEN %s != '' THEN %s ELSE customer_decline_reason END,
                            updated_at = NOW()
                        WHERE id = %s
                        RETURNING quote_number, total_amount
                    """, [
                        norm_status, norm_status,
                        notes_val, notes_val,
                        reason_val, reason_val,
                        quote_id_val
                    ])
                    row = cursor.fetchone()
                    if row:
                        qnum_val, qtotal_val = row[0], row[1]

                    # Supersede any older quotes for this job in SENT_TO_CUSTOMER / DRAFT
                    if norm_action == "ACCEPT" and job_id_val:
                        cursor.execute("""
                            UPDATE workforce_quote
                            SET status = 'SUPERSEDED', updated_at = NOW()
                            WHERE job_id = %s AND id != %s AND status IN ('SENT_TO_CUSTOMER', 'DRAFT', 'PENDING_REVIEW')
                        """, [job_id_val, quote_id_val])
            except Exception as u_err:
                logger.warning(f"Could not directly update workforce_quote {quote_id_val}: {u_err}")

        # Synchronize ServiceRequest, Estimation, and EstimationQuotation
        if job_id_val:
            try:
                import django.utils.timezone as django_timezone
                from service_requests.models import ServiceRequest, Estimation, EstimationQuotation
                sr_obj = ServiceRequest.objects.filter(id=job_id_val).first()
                if sr_obj:
                    now_dt = django_timezone.now()
                    est_obj = getattr(sr_obj, "estimation", None) or Estimation.objects.filter(service_request=sr_obj).first()

                    if norm_action == "ACCEPT":
                        sr_obj.status = ServiceRequest.Status.CUSTOMER_APPROVED if hasattr(ServiceRequest.Status, "CUSTOMER_APPROVED") else "customer_approved"
                        sr_obj.request_kind = "quoted_work"
                        sr_obj.job_type = "CHANGE_REQUEST"
                        if qnum_val:
                            sr_obj.quote_number = qnum_val
                        if qtotal_val:
                            sr_obj.total_amount = qtotal_val
                        sr_obj.save(update_fields=["status", "request_kind", "job_type", "quote_number", "total_amount", "updated_at"])

                        if est_obj:
                            est_obj.status = "CUSTOMER_APPROVED"
                            est_obj.save(update_fields=["status", "updated_at"])

                            # Match target EstimationQuotation
                            eq = None
                            if qnum_val:
                                eq = est_obj.quotations.filter(quote_ref__startswith=str(qnum_val).split('-V')[0]).order_by("-id").first()
                            if not eq:
                                eq = est_obj.quotations.order_by("-id").first()
                            if eq:
                                eq.status = "APPROVED"
                                eq.customer_approved_at = now_dt
                                eq.save(update_fields=["status", "customer_approved_at", "updated_at"])
                            est_obj.quotations.filter(status="SENT").exclude(id=eq.id if eq else -1).update(status="SUPERSEDED")

                    elif norm_action == "DECLINE":
                        if est_obj:
                            est_obj.status = "CUSTOMER_REJECTED"
                            est_obj.save(update_fields=["status", "updated_at"])
                            eq = est_obj.quotations.order_by("-id").first()
                            if eq:
                                eq.status = "REJECTED"
                                eq.customer_rejected_at = now_dt
                                eq.rejection_reason = reason_val
                                eq.rejection_note = notes_val
                                eq.save(update_fields=["status", "customer_rejected_at", "rejection_reason", "rejection_note", "updated_at"])

                    elif norm_action == "REQUEST_CHANGES":
                        if est_obj:
                            est_obj.status = "CHANGES_REQUESTED"
                            est_obj.save(update_fields=["status", "updated_at"])

                    # Broadcast tracking event to update live customer screen and booking
                    from service_requests.notifications import broadcast_tracking_event
                    broadcast_tracking_event(sr_obj, event_type="quote_decision_updated")
                    broadcast_tracking_event(sr_obj, event_type="quotation.approved" if norm_action == "ACCEPT" else "quotation.rejected")
            except Exception as b_err:
                logger.warning(f"Error synchronizing booking/estimation on quote decision: {b_err}")

        # Clear quote caches
        for k in [f"wf_quote_{token}", f"wf_quote_{resolved_token}", f"wf_quote_{job_id_val}"]:
            cache.delete(k)

        if http_success:
            return {"success": True, "message": res_json.get("message", "Quotation decision recorded successfully."), "data": res_json}

        if quote_id_val:
            return {"success": True, "message": "Quotation decision recorded successfully."}

        return {"success": False, "message": "Failed to record quote decision with workforce service."}



