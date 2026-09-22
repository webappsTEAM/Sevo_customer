from celery import shared_task
import logging
from django.utils import timezone

logger = logging.getLogger("service_requests.dispatch")


@shared_task(bind=True, max_retries=4, default_retry_delay=15)
def async_dispatch_service_request(self, service_request_id: int):
    """
    Asynchronously dispatches a ServiceRequest to the external Workforce system.
    Retries up to 4 times with exponential backoff on failure.
    Updates dispatch_status, dispatch_attempts, last_dispatch_error, and last_dispatched_at.
    """
    from service_requests.models import ServiceRequest
    from workforce_integration.services import WorkforceIntegrationService

    sr = ServiceRequest.objects.filter(pk=service_request_id).first()
    if not sr:
        logger.warning(f"async_dispatch_service_request: ServiceRequest ID {service_request_id} not found.")
        return {"success": False, "error": "Booking not found"}

    # If already dispatched and workforce_job_id is assigned, skip redundant dispatch
    if sr.dispatch_status == ServiceRequest.DispatchStatus.DISPATCHED and sr.workforce_job_id:
        logger.info(f"Booking {sr.request_id} is already dispatched (Job ID: {sr.workforce_job_id}).")
        return {"success": True, "workforce_job_id": sr.workforce_job_id}

    sr.dispatch_attempts += 1
    sr.last_dispatched_at = timezone.now()

    try:
        res = WorkforceIntegrationService.dispatch_job(sr)
        if res.get("success"):
            sr.dispatch_status = ServiceRequest.DispatchStatus.DISPATCHED
            sr.last_dispatch_error = ""
            sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
            logger.info(f"Booking {sr.request_id} successfully dispatched on attempt {sr.dispatch_attempts}.")
            return res
        else:
            err_msg = res.get("message") or res.get("error") or "Workforce dispatch returned failure"
            sr.last_dispatch_error = str(err_msg)[:500]
            if self.request.retries < self.max_retries:
                sr.dispatch_status = ServiceRequest.DispatchStatus.PENDING_RETRY
                sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
                countdown = 15 * (2 ** self.request.retries)
                logger.warning(f"Booking {sr.request_id} dispatch failed (attempt {sr.dispatch_attempts}): {err_msg}. Retrying in {countdown}s...")
                raise self.retry(countdown=countdown, exc=Exception(err_msg))
            else:
                sr.dispatch_status = ServiceRequest.DispatchStatus.FAILED
                sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
                logger.error(f"Booking {sr.request_id} dispatch permanently FAILED after {sr.dispatch_attempts} attempts: {err_msg}")
                return {"success": False, "error": err_msg, "exhausted": True}
    except self.MaxRetriesExceededError:
        sr.dispatch_status = ServiceRequest.DispatchStatus.FAILED
        sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
        logger.error(f"Booking {sr.request_id} dispatch permanently FAILED (Max retries exceeded).")
        return {"success": False, "error": "Max retries exceeded", "exhausted": True}
    except Exception as exc:
        if self.request.retries < self.max_retries:
            sr.dispatch_status = ServiceRequest.DispatchStatus.PENDING_RETRY
            sr.last_dispatch_error = str(exc)[:500]
            sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
            countdown = 15 * (2 ** self.request.retries)
            logger.warning(f"Booking {sr.request_id} dispatch exception on attempt {sr.dispatch_attempts}: {exc}. Retrying in {countdown}s...")
            raise self.retry(countdown=countdown, exc=exc)
        else:
            sr.dispatch_status = ServiceRequest.DispatchStatus.FAILED
            sr.last_dispatch_error = str(exc)[:500]
            sr.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
            logger.error(f"Booking {sr.request_id} dispatch permanently FAILED: {exc}")
            return {"success": False, "error": str(exc), "exhausted": True}


@shared_task
def generate_due_amc_bookings():
    """
    HS-B-07: generates one ServiceRequest for every BookingSeries whose
    next_run_date has arrived. See generate_due_bookings() in
    service_requests/services/__init__.py for the full generation logic
    and its "no backdated catch-up" rule.
    """
    from service_requests.services import generate_due_bookings
    created, failed = generate_due_bookings()
    return f"AMC generation: {len(created)} booking(s) created, {len(failed)} series failed."
