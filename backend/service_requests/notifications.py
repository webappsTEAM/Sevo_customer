"""
service_requests/notifications.py

Notification helpers for the service request pipeline.
In dev: prints to console (matches EMAIL_BACKEND = console).
In prod: sends via the configured SMTP backend.
"""
import logging
import os

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail as _django_send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


# ── Canonical Customer Tracking URL Generator ─────────────────────────────────

def build_customer_tracking_url(service_request_or_token) -> str:
    """
    Construct the canonical public customer live tracking URL.
    - Resolves the unguessable UUID tracking_token (never sequential ServiceRequest IDs).
    - Respects settings.FRONTEND_URL.
    - Handles production base paths (/sevo) gracefully whether FRONTEND_URL
      already includes it or whether it's configured via FRONTEND_BASE_PATH / FRONTEND_SUBPATH.
    - Guaranteed to point to the existing public tracking page and work after reload.
    """
    if hasattr(service_request_or_token, "tracking_token"):
        token = str(service_request_or_token.tracking_token or "").strip()
        if not token:
            import uuid
            new_token = uuid.uuid4()
            service_request_or_token.tracking_token = new_token
            if getattr(service_request_or_token, "pk", None):
                service_request_or_token.save(update_fields=["tracking_token"])
            token = str(new_token)
    else:
        token = str(service_request_or_token or "").strip()

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    subpath = os.getenv("FRONTEND_SUBPATH", "").strip().rstrip("/")
    if not subpath:
        # In production, Vite builds with base '/sevo/' and main.jsx uses basename '/sevo'
        if not getattr(settings, "DEBUG", False) and "/sevo" not in frontend_url and "localhost" not in frontend_url:
            subpath = os.getenv("FRONTEND_BASE_PATH", "/sevo").strip().rstrip("/")
    if subpath and not subpath.startswith("/"):
        subpath = f"/{subpath}"
    if subpath and frontend_url.endswith(subpath):
        subpath = ""

    return f"{frontend_url}{subpath}/tracking/{token}"


# ── Canonical SMS Notification Dispatcher ─────────────────────────────────────

def send_sms_notification(
    mobile_number: str,
    message: str,
    event_key: str = "",
    service_request=None,
    preference_field: str = None,
) -> bool:
    """
    Dispatches a transactional SMS using the configured SMS provider.

    Guarantees:
    - Never raises an unhandled exception into the caller.
    - Deterministic idempotency: checks NotificationOutbox for 'SMS:{event_key}'.
      Repeated webhook or retry attempts will NOT cause duplicate SMS messages.
    - Records persistent outbox record in NotificationOutbox with status SENT, FAILED, or SKIPPED.
    - Gracefully handles missing/invalid numbers or unconfigured provider credentials.
    - Respects customer notification preferences if customer exists and preference_field is specified.
    """
    clean_phone = (mobile_number or "").strip()
    if not clean_phone:
        logger.info("[SMS] No phone number provided for event '%s' -- SMS skipped.", event_key)
        return False

    if service_request and preference_field:
        if not _customer_wants(getattr(service_request, "customer", None), preference_field):
            logger.info("[SMS] Customer opted out of %s -- skipping SMS for '%s'.", preference_field, event_key)
            return False

    outbox_subject = f"SMS:{event_key}" if event_key else f"SMS:adhoc:{clean_phone}"

    from .models import NotificationOutbox

    # Idempotency check: fast cache + persistent database outbox
    if event_key:
        cache_key = f"sms_sent_{event_key}"
        if cache.get(cache_key):
            logger.info("[SMS] Duplicate SMS prevented by cache for key '%s'", event_key)
            return True

        try:
            if NotificationOutbox.objects.filter(subject=outbox_subject, status="SENT").exists():
                logger.info("[SMS] Duplicate SMS prevented by persistent outbox for key '%s'", event_key)
                cache.set(cache_key, True, timeout=86400)
                return True
        except Exception as db_err:
            logger.warning("[SMS] Could not check persistent outbox for '%s': %s", event_key, db_err)

    from accounts.services import get_sms_provider
    try:
        provider = get_sms_provider()
    except Exception as prov_err:
        logger.error("[SMS] Failed to initialize SMS provider: %s", prov_err)
        return False

    success = False
    outbox_status = "SKIPPED"
    outbox_error = ""

    try:
        success = bool(provider.send_sms(clean_phone, message))
        if success:
            outbox_status = "SENT"
            outbox_error = ""
            logger.info("[SMS] SMS for '%s' successfully sent to %s", event_key, clean_phone[-4:])
        else:
            outbox_status = "SKIPPED"
            outbox_error = "SMS provider returned False or credentials unconfigured"
            logger.info("[SMS] SMS for '%s' skipped (provider unconfigured or unavailable).", event_key)
    except Exception as exc:
        success = False
        outbox_status = "FAILED"
        outbox_error = str(exc)
        logger.warning("[SMS] Error sending SMS for key '%s' to %s: %s", event_key, clean_phone[-4:], exc)

    # Persist outbox delivery record
    try:
        NotificationOutbox.objects.create(
            recipient=clean_phone,
            subject=outbox_subject,
            body_text=message,
            body_html="",
            from_email=getattr(settings, "TWILIO_FROM_NUMBER", "") or "SMS",
            status=outbox_status,
            error=outbox_error,
        )
    except Exception as outbox_err:
        logger.error("[NotificationOutbox] Failed to persist SMS outbox record: %s", outbox_err)

    if success and event_key:
        cache.set(f"sms_sent_{event_key}", True, timeout=86400)

    return success


def send_mail(subject, message, from_email, recipient_list, fail_silently=False, html_message=None, **kwargs):
    """
    HS-D-04: transparent wrapper around django.core.mail.send_mail. Every one
    of this file's ~19 existing send_mail(...) call sites picks this up
    automatically -- same name, same signature -- with ZERO changes to those
    call sites, so their existing fail_silently/return-value-checking logic
    (added earlier this session for EC-05/X-07) is completely unchanged.
    This adds exactly one thing: a persisted NotificationOutbox row per
    recipient per attempt, whether it succeeded or failed, which is what
    actually answers "was the customer told?" and what
    retry_failed_notifications (management command) replays for FAILED rows.

    Deliberately does NOT change delivery to be async/queued -- sending is
    still inline in the request path, exactly as before. Queueing sending
    itself would be a bigger, riskier change (a broker, a worker process)
    than this session can safely stand up and verify without a live
    environment; the outbox record is the safe, real half of "delivery
    guarantee": every attempt is now provably recorded and retryable.
    """
    error = ""
    result = 0
    try:
        result = _django_send_mail(subject, message, from_email, recipient_list, fail_silently=fail_silently, html_message=html_message, **kwargs)
    except Exception as exc:
        error = str(exc)
        if not fail_silently:
            _write_outbox(recipient_list, subject, message, html_message, from_email, error)
            raise

    status = "SENT" if result else "FAILED"
    _write_outbox(recipient_list, subject, message, html_message, from_email, error, status=status)
    return result


def _write_outbox(recipient_list, subject, message, html_message, from_email, error, status=None):
    from .models import NotificationOutbox
    if status is None:
        status = "FAILED" if error else "SENT"
    try:
        for recipient in (recipient_list or []):
            NotificationOutbox.objects.create(
                recipient=recipient,
                subject=subject or "",
                body_text=message or "",
                body_html=html_message or "",
                from_email=from_email or "",
                status=status,
                error=error,
            )
    except Exception as outbox_err:
        # The outbox is a record of delivery, not the delivery itself -- a
        # failure to WRITE the record must never be raised back into a
        # notification call, or an outbox bug could start breaking the
        # actual notifications it's meant to be observing.
        logger.error("[NotificationOutbox] Failed to persist outbox record: %s", outbox_err)


def _customer_wants(user, field_name) -> bool:
    """
    HS-D-05: gate customer-facing notifications on CustomerNotificationPreference.
    Fails open (returns True) whenever there's no user (guest booking with no
    account -- there's nothing to gate on), no preference row yet (default is
    "send", matching the model field defaults), or any lookup error --
    consistent with this file's existing fail_silently-but-logged philosophy:
    a broken preference check should never be the reason a real customer
    misses a notification they'd actually want.
    """
    if not user:
        return True
    try:
        from accounts.models import CustomerNotificationPreference
        pref = CustomerNotificationPreference.objects.filter(user=user).only(field_name).first()
        if pref is None:
            return True
        return bool(getattr(pref, field_name, True))
    except Exception as exc:
        logger.warning("[NotificationPreference] Lookup failed for user %s field %s: %s -- defaulting to send.", getattr(user, "id", None), field_name, exc)
        return True


def _get_category_display_name(service_request) -> str:
    """
    Resolve the human-readable category name from the service request.
    Tries the CatalogCategory table first, then falls back to the static
    SERVICE_CATEGORIES choices, and finally humanises the raw slug.
    """
    raw = (service_request.service_category or "").strip()
    if not raw:
        return "Service"

    # 1. Try CatalogCategory table (slug lookup)
    try:
        from service_requests.models import CatalogCategory
        cat = CatalogCategory.objects.filter(slug=raw).first()
        if cat and cat.name:
            return cat.name
    except Exception:
        pass

    # 2. Try the static SERVICE_CATEGORIES list
    try:
        from service_requests.models import SERVICE_CATEGORIES
        for slug, label in SERVICE_CATEGORIES:
            if slug == raw:
                return label
    except Exception:
        pass

    # 3. Humanise the slug (ac_heating -> Ac Heating)
    return raw.replace("_", " ").title()


def _render_html_template(title, greeting, intro_text, details_dict, cta_url=None, cta_text=None, footer_note=None):
    """Build a premium HTML email template."""
    details_html = ""
    if details_dict:
        details_html = '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 24px 0; font-size: 14px; text-align: left;">'
        for label, val in details_dict.items():
            details_html += f'<div style="margin-bottom: 10px; color: #475569; line-height: 1.5;"><strong style="color: #0f172a; min-width: 140px; display: inline-block;">{label}:</strong> {val}</div>'
        details_html += '</div>'

    cta_html = ""
    if cta_url and cta_text:
        cta_html = f'<div style="text-align: center; margin: 32px 0;"><a href="{cta_url}" target="_blank" style="background-color: #5d5fef; color: #ffffff; padding: 14px 28px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 15px;">{cta_text}</a></div>'

    footer_note_html = ""
    if footer_note:
        footer_note_html = f'<p style="color: #64748b; font-size: 12px; margin-top: 24px; font-style: italic; line-height: 1.5;">{footer_note}</p>'

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 0;">
<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
<tr><td style="background-color: #5d5fef; padding: 36px 32px; text-align: center;">
<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">QuickTIMS</h1>
<p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">SERVICE MANAGEMENT PORTAL</p>
</td></tr>
<tr><td style="padding: 40px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
<h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">{greeting}</h2>
<p style="margin-top: 0; color: #475569;">{intro_text}</p>
{details_html}
{cta_html}
{footer_note_html}
</td></tr>
<tr><td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px;">
<p style="margin: 0 0 8px 0; font-weight: 600;">QuickTIMS Service Portal</p>
<p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    return html


# -- Primary: combined completion + feedback email ----------------------------

def send_completion_and_feedback_email(service_request, feedback_token: str) -> None:
    """
    Single combined email and SMS sent automatically when employee marks job complete.
    Includes: work completion summary + unique feedback link button.
    """
    tracking_url = build_customer_tracking_url(service_request)

    # 1. Transactional SMS with tracking/completion URL
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_body = f"SEVO: Booking {service_request.request_id} completed. View details: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:booking-completed"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_body,
                event_key=event_key,
                service_request=service_request,
                preference_field="completion_feedback",
            )
        except Exception as sms_err:
            logger.warning("[ServiceRequests] Failed to send completion SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email completion & feedback
    recipient = service_request.email
    if not recipient:
        logger.info(
            "[ServiceRequests] No email for %s -- completion+feedback email skipped.",
            service_request.request_id,
        )
        return

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    feedback_url = f"{frontend_url}/feedback/{feedback_token}"

    # ServiceRequest.assigned_employee was removed by migration 0038 when the
    # workforce concern moved to the vendor app, so this raised AttributeError
    # every time a feedback request was sent. The vendor now pushes the
    # technician's identity in over the webhook, which writes
    # BookingAssignment.technician_name and mirrors it onto
    # ServiceRequest.technician_name (workforce_integration/views.py) -- that
    # snapshot is the Customer app's technician identity now, and is what
    # every other reader here already uses.
    technician_name = (service_request.technician_name or "").strip() or "Our technician"

    category_name = _get_category_display_name(service_request)
    completed_on  = timezone.now().strftime("%d %b %Y, %I:%M %p")
    amount_str    = f"${service_request.total_amount:,.2f}" if service_request.total_amount else "N/A"

    subject = (
        f"Work Completed - {service_request.issue_title} "
        f"[{service_request.request_id}]"
    )

    plain_body = (
        f"Dear {service_request.customer_name},\n\n"
        f"Great news! Your service request ({service_request.request_id}) has been completed.\n\n"
        f"Service Details:\n"
        f"  Request ID    : {service_request.request_id}\n"
        f"  Service       : {service_request.issue_title}\n"
        f"  Category      : {category_name}\n"
        f"  Completed By  : {technician_name}\n"
        f"  Completed On  : {completed_on}\n"
        f"  Total Amount  : {amount_str}\n\n"
        f"We would love to hear your feedback! Please rate our service:\n"
        f"{feedback_url}\n\n"
        f"This link is unique to your request and can only be used once.\n\n"
        f"Thank you for choosing our service!\n"
        f"The Service Team\n"
    )

    details = {
        "Request ID"   : service_request.request_id,
        "Service"      : service_request.issue_title,
        "Category"     : category_name,
        "Completed By" : technician_name,
        "Completed On" : completed_on,
        "Total Amount" : amount_str,
    }

    html_body = _render_html_template(
        title=f"Work Completed - {service_request.request_id}",
        greeting=f"Great news, {service_request.customer_name}!",
        intro_text=(
            "Your service request has been successfully completed by our technician. "
            "Below is a summary of the work done. We would love to hear how we did - "
            "please take a moment to rate your experience using the button below."
        ),
        details_dict=details,
        cta_url=feedback_url,
        cta_text="Rate Our Service",
        footer_note=(
            "This feedback link is unique to your request and can only be used once. "
            "If you have any concerns, please contact our support team."
        ),
    )

    try:
        send_mail(
            subject=subject,
            message=plain_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=False,
        )
        logger.info(
            "[ServiceRequests] Completion+feedback email sent to %s for %s",
            recipient,
            service_request.request_id,
        )
    except Exception as exc:
        logger.error(
            "[ServiceRequests] Failed to send completion+feedback email for %s: %s",
            service_request.request_id,
            exc,
        )


# -- Legacy / admin helpers ---------------------------------------------------

def send_feedback_link(service_request, feedback_token: str) -> None:
    """
    Kept for backward compatibility (admin resend-feedback/ endpoint).
    Sends only the feedback link email when admin manually resends.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    link = f"{frontend_url}/feedback/{feedback_token}"
    category_name = _get_category_display_name(service_request)

    subject = f"How was your service? [{service_request.request_id}]"
    body = (
        f"Dear {service_request.customer_name},\n\n"
        f"Your service request ({service_request.request_id}) has been completed "
        f"and verified by our team.\n\n"
        f"We would love to hear your feedback. Please click the link below:\n\n"
        f"{link}\n\n"
        f"This link is unique to your request and can only be used once.\n\n"
        f"Thank you for choosing our service.\n"
    )

    details = {
        "Request ID"      : service_request.request_id,
        "Service Category": category_name,
        "Issue Title"     : service_request.issue_title,
    }

    html_body = _render_html_template(
        title="Share Your Feedback",
        greeting=f"Dear {service_request.customer_name},",
        intro_text="Thank you for choosing us! Your service request has been successfully completed and verified. We would love to hear about your experience.",
        details_dict=details,
        cta_url=link,
        cta_text="Rate Our Service",
        footer_note="Note: This feedback link is unique to your request and can only be used once to submit your review."
    )

    recipient = service_request.email
    if not recipient:
        logger.info(
            "[ServiceRequests] No email for %s -- feedback link: %s",
            service_request.request_id,
            link,
        )
        return

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=False,
        )
        logger.info(
            "[ServiceRequests] Feedback link sent to %s for %s",
            recipient,
            service_request.request_id,
        )
    except Exception as exc:
        logger.error(
            "[ServiceRequests] Failed to send feedback email for %s: %s",
            service_request.request_id,
            exc,
        )


def notify_account_created(customer_user, service_request) -> None:
    """
    Fixes HS-A-02 (partial): booking as a guest silently creates a
    login-capable account (BookingCreateView.post(), User.objects.create()
    with no password) with no communication to the customer that this
    happened at all -- they find out only if they later try to log in and
    it works. This doesn't change that account-creation behaviour (a
    genuine 'ask before creating an account' flow is a bigger frontend/UX
    change), but it at least tells them an account now exists and how to
    use it, right after the booking that created it.
    """
    recipient = getattr(customer_user, "email", "") or service_request.email
    if not recipient:
        logger.info("[ServiceRequests] No email for new account on booking %s -- account-created notice skipped.", service_request.request_id)
        return

    subject = "An account was created for you"
    details = {
        "Request ID": service_request.request_id,
        "Phone"     : getattr(customer_user, "phone", "") or "N/A",
        "Email"     : recipient,
    }
    html_body = _render_html_template(
        title="Account Created",
        greeting=f"Dear {service_request.customer_name},",
        intro_text=(
            "Since this was your first booking with us, we've created an account so you "
            "can track this and future bookings in one place. There's no password to "
            "remember -- log in anytime using a one-time code sent to this phone number "
            "or email."
        ),
        details_dict=details,
        footer_note="If you'd prefer not to have an account, contact support and we'll remove it."
    )

    try:
        _sent = send_mail(
            subject=subject,
            message=(
                f"An account was created for you when you booked {service_request.request_id}. "
                f"Log in anytime with a one-time code sent to your phone or email -- no password needed."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[ServiceRequests] Account-created notice sent to %s for %s", recipient, service_request.request_id)
        else:
            logger.error("[ServiceRequests] send_mail reported 0 messages delivered (account created) to %s for %s", recipient, service_request.request_id)
    except Exception as exc:
        logger.error("[ServiceRequests] Failed to send account-created email for %s: %s", service_request.request_id, exc)


def send_booking_confirmation(service_request) -> None:
    """Send a booking confirmation email and SMS to the customer."""
    category_name = _get_category_display_name(service_request)
    tracking_url = build_customer_tracking_url(service_request)

    # 1. SMS notification with public tracking URL
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: Booking {service_request.request_id} confirmed. Track your driver live: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:booking-confirmed"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="booking_confirmations",
            )
        except Exception as sms_err:
            logger.warning("[ServiceRequests] Failed to send booking confirmation SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email notification
    recipient = service_request.email
    if not recipient:
        logger.info("[ServiceRequests] No email for %s -- booking confirmation email skipped.", service_request.request_id)
        return

    subject = f"Booking Confirmation [{service_request.request_id}]"
    body = (
        f"Dear {service_request.customer_name},\n\n"
        f"Thank you for submitting a service booking request with us.\n\n"
        f"Booking Details:\n"
        f"- Request ID: {service_request.request_id}\n"
        f"- Service Category: {category_name}\n"
        f"- Issue Title: {service_request.issue_title}\n"
        f"- Preferred Date: {service_request.preferred_date}\n\n"
        f"Track your booking live: {tracking_url}\n\n"
        f"We will review your request and assign a technician shortly.\n\n"
        f"Best regards,\n"
        f"The Service Team\n"
    )

    details = {
        "Request ID"      : service_request.request_id,
        "Service Category": category_name,
        "Issue Title"     : service_request.issue_title,
        "Preferred Date"  : str(service_request.preferred_date),
    }

    html_body = _render_html_template(
        title="Booking Confirmation",
        greeting=f"Dear {service_request.customer_name},",
        intro_text="Thank you for submitting a service booking request with us. Our team is currently reviewing the details and will assign a technician shortly.",
        details_dict=details,
        cta_url=tracking_url,
        cta_text="Track Your Booking",
        footer_note="We will send you another update as soon as a technician is assigned to your ticket."
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=False,
        )
        logger.info("[ServiceRequests] Booking confirmation sent to %s for %s", recipient, service_request.request_id)
    except Exception as exc:
        logger.error("[ServiceRequests] Failed to send booking confirmation email for %s: %s", service_request.request_id, exc)


def notify_technician_assigned(service_request, technician_name="") -> None:
    """
    Fixes HS-D-06 (partial): customer notification when a technician/driver
    accepts their booking. Called from WorkforceWebhookView on employee_accepted.
    Sends both SMS (with live tracking link) and email.
    """
    category_name = _get_category_display_name(service_request)
    tech_display = technician_name or service_request.technician_name or "Your assigned professional"
    tracking_url = build_customer_tracking_url(service_request)

    # 1. SMS notification with public tracking URL
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: Your driver has accepted booking {service_request.request_id}. Track live: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:driver-accepted"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="technician_updates",
            )
        except Exception as sms_err:
            logger.warning("[ServiceRequests] Failed to send driver-accepted SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email notification
    recipient = service_request.email
    if not recipient:
        logger.info("[ServiceRequests] No email for %s -- technician-assigned notification skipped.", service_request.request_id)
        return
    if not _customer_wants(getattr(service_request, "customer", None), "technician_updates"):
        logger.info("[ServiceRequests] Customer opted out of technician_updates -- skipping technician-assigned notification for %s.", service_request.request_id)
        return

    subject = f"A technician has been assigned [{service_request.request_id}]"
    details = {
        "Request ID"      : service_request.request_id,
        "Service Category": category_name,
        "Technician"      : tech_display,
        "Preferred Date"  : str(service_request.preferred_date),
    }

    html_body = _render_html_template(
        title="Technician Assigned",
        greeting=f"Dear {service_request.customer_name},",
        intro_text=f"{tech_display} has been assigned to your booking and will be in touch shortly.",
        details_dict=details,
        cta_url=tracking_url,
        cta_text="Track Live",
        footer_note="We'll notify you again once they're on the way."
    )

    try:
        _sent = send_mail(
            subject=subject,
            message=f"{tech_display} has been assigned to your booking {service_request.request_id}. Track live: {tracking_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[ServiceRequests] Technician-assigned notification sent to %s for %s", recipient, service_request.request_id)
        else:
            logger.error("[ServiceRequests] send_mail reported 0 messages delivered (technician assigned) to %s for %s", recipient, service_request.request_id)
    except Exception as exc:
        logger.error("[ServiceRequests] Failed to send technician-assigned email for %s: %s", service_request.request_id, exc)


def notify_technician_on_the_way(service_request, technician_name="") -> None:
    """Fixes HS-D-06 (partial): email and SMS when the technician starts heading over."""
    category_name = _get_category_display_name(service_request)
    tech_display = technician_name or service_request.technician_name or "Your assigned professional"
    tracking_url = build_customer_tracking_url(service_request)

    # 1. SMS notification with public tracking URL
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: Your driver is on the way for booking {service_request.request_id}. Track live: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:driver-on-the-way"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="technician_updates",
            )
        except Exception as sms_err:
            logger.warning("[ServiceRequests] Failed to send driver-on-the-way SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email notification
    recipient = service_request.email
    if not recipient:
        logger.info("[ServiceRequests] No email for %s -- on-the-way notification skipped.", service_request.request_id)
        return
    if not _customer_wants(getattr(service_request, "customer", None), "technician_updates"):
        logger.info("[ServiceRequests] Customer opted out of technician_updates -- skipping on-the-way notification for %s.", service_request.request_id)
        return

    subject = f"Your technician is on the way [{service_request.request_id}]"
    details = {
        "Request ID"      : service_request.request_id,
        "Service Category": category_name,
        "Technician"      : tech_display,
    }

    html_body = _render_html_template(
        title="Technician On The Way",
        greeting=f"Dear {service_request.customer_name},",
        intro_text=f"{tech_display} is now on the way to your location.",
        details_dict=details,
        cta_url=tracking_url,
        cta_text="Track Live",
        footer_note="You can track their live location from your booking's tracking link."
    )

    try:
        _sent = send_mail(
            subject=subject,
            message=f"{tech_display} is on the way for your booking {service_request.request_id}. Track live: {tracking_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[ServiceRequests] On-the-way notification sent to %s for %s", recipient, service_request.request_id)
        else:
            logger.error("[ServiceRequests] send_mail reported 0 messages delivered (on the way) to %s for %s", recipient, service_request.request_id)
    except Exception as exc:
        logger.error("[ServiceRequests] Failed to send on-the-way email for %s: %s", service_request.request_id, exc)


def notify_delivery_recipient(service_request, technician_name="") -> None:
    """
    Fixes GT-D-03: the person receiving a Goods & Transport delivery had no
    way to be notified -- no contact info was even captured for them
    before this pass. Now that ServiceRequest.drop_contact_email and
    drop_contact_phone exist, notify the consignee via SMS and/or email.
    """
    tracking_url = build_customer_tracking_url(service_request)
    tech_display = technician_name or service_request.technician_name or "Our delivery partner"

    # 1. Consignee SMS notification
    drop_phone = (getattr(service_request, "drop_contact_phone", "") or "").strip()
    if drop_phone:
        sms_msg = f"SEVO: Your delivery is on the way. Track live: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:consignee-on-the-way"
        try:
            send_sms_notification(
                mobile_number=drop_phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field=None,
            )
        except Exception as sms_err:
            logger.warning("[ServiceRequests] Failed to send consignee SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Consignee Email notification
    recipient = (getattr(service_request, "drop_contact_email", "") or "").strip()
    if not recipient:
        return

    subject = f"A delivery is on the way to you [{service_request.request_id}]"
    details = {
        "Reference"        : service_request.request_id,
        "Delivery Address" : service_request.drop_address or "N/A",
        "Delivery Partner" : tech_display,
    }
    html_body = _render_html_template(
        title="Delivery On The Way",
        greeting=f"Hello {service_request.drop_contact_name or ''},".strip() or "Hello,",
        intro_text=f"{service_request.customer_name} has a delivery on the way to you, handled by {tech_display}.",
        details_dict=details,
        cta_url=tracking_url,
        cta_text="Track Delivery Live",
        footer_note="This is an automated notice -- please have someone available to receive the delivery."
    )

    try:
        _sent = send_mail(
            subject=subject,
            message=f"A delivery ({service_request.request_id}) is on the way to {service_request.drop_address or 'your address'}, handled by {tech_display}. Track live: {tracking_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message=html_body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[ServiceRequests] Delivery-recipient notice sent to %s for %s", recipient, service_request.request_id)
        else:
            logger.error("[ServiceRequests] send_mail reported 0 messages delivered (delivery recipient) to %s for %s", recipient, service_request.request_id)
    except Exception as exc:
        logger.error("[ServiceRequests] Failed to send delivery-recipient email for %s: %s", service_request.request_id, exc)


def notify_gt_delivery_completed(service_request, technician_name="") -> None:
    """
    GT Mini Truck audit fix: DELIVERED (the moment the trip is over and the
    final, reconciled fare is set -- see workforce_integration/views.py
    _reconcile_final_fare) previously only broadcast a websocket event and
    updated the DB; the customer who booked the trip got no SMS/email
    telling them their goods actually arrived (the earlier delivery-OTP
    notice fires when the driver reaches the drop location, before
    unloading -- not the same moment as DELIVERED). Modeled directly on the
    existing notify_customer_cancelled()/notify_delivery_recipient()
    pattern in this file: same SMS helper, same preference check, same
    HTML template helper. Scoped to goods_transport_truck only.
    """
    customer = getattr(service_request, "customer", None)
    tracking_url = build_customer_tracking_url(service_request)
    tech_display = technician_name or getattr(service_request, "technician_name", "") or "Your driver"

    # 1. SMS delivery-completed notification
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: Your goods for booking {service_request.request_id} have been delivered. Details: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:gt-delivered"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="booking_confirmations",
            )
        except Exception as sms_err:
            logger.warning("[GTDelivery] Failed to send delivered SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email delivery-completed notification
    customer_email = getattr(customer, "email", None) or service_request.email
    if not customer_email:
        return
    if not _customer_wants(customer, "booking_confirmations"):
        logger.info("[GTDelivery] Customer opted out of booking_confirmations -- skipping delivered notification for booking %s.", service_request.request_id)
        return

    subject = f"[sevo] Delivered — {service_request.request_id}"
    body = _render_html_template(
        title="Goods Delivered",
        greeting=f"Hello {customer.get_full_name() if customer else service_request.customer_name or 'Customer'},",
        intro_text=f"Your goods for booking {service_request.request_id} have been delivered, handled by {tech_display}.",
        details_dict={
            "Booking ID": service_request.request_id,
            "Pickup": service_request.address or "N/A",
            "Drop-off": getattr(service_request, "drop_address", "") or "N/A",
            "Driver": tech_display,
        },
        cta_url=tracking_url,
        cta_text="View Trip Details",
        footer_note="If a balance payment is due, please settle it with the driver or via the app.",
    )
    try:
        _sent = send_mail(
            subject,
            f"Your goods for booking {service_request.request_id} have been delivered. Details: {tracking_url}",
            settings.DEFAULT_FROM_EMAIL,
            [customer_email],
            html_message=body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[GTDelivery] Delivered notification sent to %s for %s", customer_email, service_request.request_id)
        else:
            logger.error("[GTDelivery] send_mail reported 0 messages delivered to %s for booking %s", customer_email, service_request.request_id)
    except Exception as exc:
        logger.error("[GTDelivery] Failed to send delivered notification for %s: %s", service_request.request_id, exc)


_PM_LEG_NOTICE_COPY = {
    "TEAM_EN_ROUTE": (
        "Your packers & movers crew is on the way to your pickup location.",
        "Move Crew On The Way",
    ),
    "ARRIVED_PICKUP": (
        "Your crew has arrived at the pickup location and will begin packing shortly.",
        "Crew Arrived At Pickup",
    ),
    "IN_TRANSIT": (
        "Your belongings are packed and in transit to the drop-off location.",
        "Move In Transit",
    ),
    "ARRIVED_DROP": (
        "Your crew has arrived at the drop-off location and will begin unloading shortly.",
        "Crew Arrived At Drop-off",
    ),
    "DELIVERED": (
        "Your move is complete -- all items have been delivered and unpacked.",
        "Move Completed",
    ),
    # Bug found: COMPLETED used to carry the identical copy as DELIVERED.
    # PM_LEG_SEQUENCE treats DELIVERED and COMPLETED as two distinct,
    # forward-only legs a normal move genuinely transitions through, and each
    # leg transition calls notify_pm_move_update() separately (see
    # workforce_integration/views.py), so every customer received the same
    # "your move is complete" SMS + email twice -- the SMS dedup key is keyed
    # per-leg (pm-delivered vs pm-completed), not per logical event, so it
    # didn't catch this, and the email path has no dedup at all. DELIVERED is
    # the customer-meaningful moment (goods actually arrived/unpacked);
    # COMPLETED is an internal finalization step with nothing new to tell the
    # customer, so it intentionally has no entry here and notify_pm_move_update
    # no-ops for it (see the `if not copy: return` below) rather than sending
    # a second identical notice.
}


def notify_pm_move_update(service_request, leg, technician_name="") -> None:
    """
    P&M audit fix: unlike the GT (Mini Truck / Two Wheeler) categories,
    Packers & Movers had NO leg-transition customer notifications at all --
    the GT-only leg-notice block in workforce_integration/views.py is
    explicitly scoped to goods_transport_truck/goods_transport_two_wheeler
    and correctly does not fire for packers_movers, but nothing was put in
    its place, so a P&M customer got no SMS/email at crew-en-route,
    arrived-at-pickup, in-transit, arrived-at-drop, or move-completed --
    only a single generic "technician on the way" notice tied to the old
    (non-leg-aware) employee_on_the_way status event. This sends
    P&M-worded (never GT delivery-style "goods delivered") notices for the
    handful of legs a customer actually cares about, modeled on the same
    notify_gt_delivery_completed()/notify_delivery_recipient() pattern:
    same SMS helper, same preference check, same HTML template helper.
    Unknown/other legs (PACKING, DISMANTLING, LOADING, UNLOADING,
    REASSEMBLY, UNPACKING, ASSIGNED) are intentionally silent to avoid
    over-notifying the customer with every one of the 13 internal stages.
    """
    leg_key = str(leg or "").strip().upper()
    copy = _PM_LEG_NOTICE_COPY.get(leg_key)
    if not copy:
        return
    sms_text, title = copy

    customer = getattr(service_request, "customer", None)
    tracking_url = build_customer_tracking_url(service_request)
    tech_display = technician_name or getattr(service_request, "technician_name", "") or "Your crew"

    # 1. SMS notification
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: {sms_text} Track: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:pm-{leg_key.lower()}"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="booking_confirmations",
            )
        except Exception as sms_err:
            logger.warning("[PMMove] Failed to send %s SMS for %s: %s", leg_key, service_request.request_id, sms_err)

    # 2. Email notification
    customer_email = getattr(customer, "email", None) or service_request.email
    if not customer_email:
        return
    if not _customer_wants(customer, "booking_confirmations"):
        logger.info("[PMMove] Customer opted out of booking_confirmations -- skipping %s notification for booking %s.", leg_key, service_request.request_id)
        return

    subject = f"[sevo] {title} — {service_request.request_id}"
    body = _render_html_template(
        title=title,
        greeting=f"Hello {customer.get_full_name() if customer else service_request.customer_name or 'Customer'},",
        intro_text=sms_text,
        details_dict={
            "Booking ID": service_request.request_id,
            "Pickup": service_request.address or "N/A",
            "Drop-off": getattr(service_request, "drop_address", "") or "N/A",
            "Crew Contact": tech_display,
        },
        cta_url=tracking_url,
        cta_text="View Move Details",
        footer_note="If a balance payment is due, please settle it with the crew lead or via the app.",
    )
    try:
        _sent = send_mail(
            subject,
            f"{sms_text} Details: {tracking_url}",
            settings.DEFAULT_FROM_EMAIL,
            [customer_email],
            html_message=body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[PMMove] %s notification sent to %s for %s", leg_key, customer_email, service_request.request_id)
        else:
            logger.error("[PMMove] send_mail reported 0 messages delivered to %s for booking %s", customer_email, service_request.request_id)
    except Exception as exc:
        logger.error("[PMMove] Failed to send %s notification for %s: %s", leg_key, service_request.request_id, exc)


def send_work_completion_email(service_request) -> None:
    """DEPRECATED no-op. Use send_completion_and_feedback_email() instead."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Slice 2 — Reschedule Notifications
# ─────────────────────────────────────────────────────────────────────────────

def notify_reschedule_created(reschedule_request) -> None:
    """Notify admin when a new reschedule request is created."""
    booking = reschedule_request.booking
    requester = reschedule_request.requested_by

    # Find admin email via company
    admin_email = None
    if booking.company:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin = User.objects.filter(company=booking.company, role__in=["admin", "manager"]).first()
        if admin and admin.email:
            admin_email = admin.email

    if not admin_email:
        logger.info("[Reschedule] No admin email found for booking %s", booking.request_id)
        return

    subject = f"[sevo] Reschedule Request — {booking.request_id}"
    try:
        _sent = send_mail(
            subject,
            (
                f"A reschedule request has been submitted.\n\n"
                f"Booking: {booking.request_id}\n"
                f"Requested By: {requester.get_full_name() or requester.email}\n"
                f"Original Date: {reschedule_request.original_scheduled_at}\n"
                f"Requested Date: {reschedule_request.requested_scheduled_at}\n"
                f"Reason: {reschedule_request.reason}\n\n"
                f"Please review and approve or reject in the admin panel."
            ),
            settings.DEFAULT_FROM_EMAIL,
            [admin_email],
            fail_silently=True,
        )
        # Fixes X-07/HS-D-04/EC-05: fail_silently=True means send_mail never
        # raises on delivery failure, so the except block below never fired
        # for real send failures — only its return value tells us. Check it.
        if _sent:
            logger.info("[Reschedule] Notification sent to %s for booking %s", admin_email, booking.request_id)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered to %s for booking %s", admin_email, booking.request_id)
    except Exception as exc:
        logger.error("[Reschedule] Failed to notify admin: %s", exc)


def notify_reschedule_decision(reschedule_request) -> None:
    """Notify customer when their reschedule request is approved or rejected."""
    booking = reschedule_request.booking
    customer_email = reschedule_request.requested_by.email
    if not customer_email:
        return
    if not _customer_wants(reschedule_request.requested_by, "reschedule_updates"):
        logger.info("[Reschedule] Customer opted out of reschedule_updates -- skipping decision notification for booking %s.", booking.request_id)
        return

    decision = reschedule_request.status  # APPROVED or REJECTED
    subject = f"[sevo] Reschedule {decision.title()} — {booking.request_id}"
    if decision == "APPROVED":
        body = (
            f"Great news! Your reschedule request for booking {booking.request_id} has been APPROVED.\n\n"
            f"New Date: {reschedule_request.requested_scheduled_at}\n"
            f"Notes: {reschedule_request.review_notes or 'N/A'}"
        )
    else:
        body = (
            f"Unfortunately, your reschedule request for booking {booking.request_id} has been REJECTED.\n\n"
            f"Notes: {reschedule_request.review_notes or 'N/A'}\n\n"
            f"Please contact support if you need further assistance."
        )

    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer_email], fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Decision notification sent to %s", customer_email)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (decision notification) to %s", customer_email)
    except Exception as exc:
        logger.error("[Reschedule] Failed to send decision notification: %s", exc)



# ─────────────────────────────────────────────────────────────────────────────
# Slice 2 Extended — New Reschedule Workflow Notifications
# ─────────────────────────────────────────────────────────────────────────────

def notify_employee_reschedule_request(reschedule_request) -> None:
    """Notify the proposed_technician that they have a reschedule to confirm."""
    emp = reschedule_request.proposed_technician
    if not emp or not emp.user.email:
        return

    booking = reschedule_request.booking
    subject = f"[sevo] New Schedule Confirmation Required — {booking.request_id}"
    body = _render_html_template(
        title="Reschedule Confirmation Required",
        greeting=f"Hello {emp.user.get_full_name() or emp.user.username},",
        intro_text="A booking has been rescheduled and requires your confirmation.",
        details_dict={
            "Booking ID": booking.request_id,
            "Service": booking.issue_title,
            "Previous Date": str(reschedule_request.current_date or "N/A"),
            "Previous Slot": reschedule_request.current_time or "N/A",
            "New Date": str(reschedule_request.new_date),
            "New Slot": reschedule_request.new_time_slot,
            "Customer Reason": reschedule_request.get_reason_display(),
        },
        footer_note="Please accept or decline this reschedule in your employee app.",
    )
    try:
        _sent = send_mail(subject, f"Reschedule confirmation needed for booking {booking.request_id}.",
                  settings.DEFAULT_FROM_EMAIL, [emp.user.email], html_message=body, fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Employee notification sent to %s", emp.user.email)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (employee notification) to %s", emp.user.email)
    except Exception as exc:
        logger.error("[Reschedule] Failed to notify employee: %s", exc)


def notify_admin_employee_rejection(reschedule_request) -> None:
    """Notify admin when employee rejects a reschedule — admin needs to find replacement."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    booking = reschedule_request.booking
    admin = None
    if booking.company:
        admin = User.objects.filter(company=booking.company, role__in=["admin", "manager"]).first()
    if not admin:
        admin = User.objects.filter(role__in=["admin", "manager"]).first()

    if not admin or not admin.email:
        return

    emp = reschedule_request.proposed_technician
    emp_name = emp.user.get_full_name() if emp else "Employee"
    subject = f"[sevo] Employee Declined Reschedule — {booking.request_id} (Action Required)"
    body = (
        f"An employee has declined the reschedule assignment.\n\n"
        f"Booking: {booking.request_id}\n"
        f"Employee: {emp_name}\n"
        f"Reason: {reschedule_request.get_employee_rejection_reason_display() if reschedule_request.employee_rejection_reason else 'Not specified'}\n"
        f"Notes: {reschedule_request.employee_response_note or 'N/A'}\n\n"
        f"Please log in to the admin panel to reassign another technician."
    )
    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [admin.email], fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Admin notified of employee rejection for %s", booking.request_id)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (employee rejection) to %s for booking %s", admin.email, booking.request_id)
    except Exception as exc:
        logger.error("[Reschedule] Failed to notify admin of rejection: %s", exc)


def notify_customer_slot_suggestion(reschedule_request) -> None:
    """Notify customer that admin has suggested an alternate slot."""
    customer_email = reschedule_request.requested_by.email
    if not customer_email:
        return
    if not _customer_wants(reschedule_request.requested_by, "reschedule_updates"):
        logger.info("[Reschedule] Customer opted out of reschedule_updates -- skipping slot suggestion notification for booking %s.", reschedule_request.booking.request_id)
        return

    booking = reschedule_request.booking
    subject = f"[sevo] Admin Suggested a New Slot — {booking.request_id}"
    body = _render_html_template(
        title="New Slot Suggested",
        greeting=f"Hello {reschedule_request.requested_by.get_full_name() or 'Customer'},",
        intro_text="Our team has reviewed your reschedule request and would like to suggest an alternate time slot.",
        details_dict={
            "Booking ID": booking.request_id,
            "Your Requested Date": str(reschedule_request.new_date),
            "Suggested New Date": str(reschedule_request.suggested_date or "N/A"),
            "Suggested New Slot": reschedule_request.suggested_time_slot or "N/A",
            "Admin Notes": reschedule_request.review_notes or "N/A",
        },
        footer_note="Please log in to your account to accept or decline this suggestion.",
    )
    try:
        _sent = send_mail(subject, "Admin has suggested a new schedule slot for your booking.",
                  settings.DEFAULT_FROM_EMAIL, [customer_email], html_message=body, fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Slot suggestion notification sent to %s", customer_email)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (slot suggestion) to %s", customer_email)
    except Exception as exc:
        logger.error("[Reschedule] Failed to notify customer of slot suggestion: %s", exc)


def notify_customer_rescheduled(reschedule_request) -> None:
    """Notify customer that their booking has been successfully rescheduled (terminal success)."""
    customer_email = reschedule_request.requested_by.email
    if not customer_email:
        return
    if not _customer_wants(reschedule_request.requested_by, "reschedule_updates"):
        logger.info("[Reschedule] Customer opted out of reschedule_updates -- skipping rescheduled notification for booking %s.", reschedule_request.booking.request_id)
        return

    booking = reschedule_request.booking
    emp = reschedule_request.proposed_technician
    subject = f"[sevo] Booking Rescheduled Successfully — {booking.request_id}"
    body = _render_html_template(
        title="Booking Rescheduled",
        greeting=f"Hello {reschedule_request.requested_by.get_full_name() or 'Customer'},",
        intro_text="Great news! Your booking has been successfully rescheduled and confirmed.",
        details_dict={
            "Booking ID": booking.request_id,
            "Service": booking.issue_title,
            "New Date": str(reschedule_request.new_date),
            "New Time Slot": reschedule_request.new_time_slot,
            "Assigned Technician": emp.user.get_full_name() if emp else "To be assigned",
        },
        footer_note="We look forward to serving you. You will receive a reminder closer to the appointment.",
    )
    try:
        _sent = send_mail(subject, f"Your booking {booking.request_id} has been rescheduled.",
                  settings.DEFAULT_FROM_EMAIL, [customer_email], html_message=body, fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Customer rescheduled notification sent to %s", customer_email)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (rescheduled) to %s for booking %s", customer_email, booking.request_id)
    except Exception as exc:
        logger.error("[Reschedule] Failed to send rescheduled notification: %s", exc)


def notify_customer_reschedule_rejected(reschedule_request) -> None:
    """Notify customer that their reschedule request was rejected."""
    customer_email = reschedule_request.requested_by.email
    if not customer_email:
        return
    if not _customer_wants(reschedule_request.requested_by, "reschedule_updates"):
        logger.info("[Reschedule] Customer opted out of reschedule_updates -- skipping rejection notification for booking %s.", reschedule_request.booking.request_id)
        return

    booking = reschedule_request.booking
    subject = f"[sevo] Reschedule Request Rejected — {booking.request_id}"
    body = (
        f"Unfortunately, your reschedule request for booking {booking.request_id} could not be approved.\n\n"
        f"Reason: {reschedule_request.get_rejection_reason_display() if reschedule_request.rejection_reason else 'N/A'}\n"
        f"Notes: {reschedule_request.rejection_notes or reschedule_request.review_notes or 'N/A'}\n\n"
        f"Please contact support if you need further assistance."
    )
    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer_email], fail_silently=True)
        if _sent:
            logger.info("[Reschedule] Rejection notification sent to %s", customer_email)
        else:
            logger.error("[Reschedule] send_mail reported 0 messages delivered (rejection) to %s", customer_email)
    except Exception as exc:
        logger.error("[Reschedule] Failed to send rejection notification: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Slice 2b — Cancellation Notifications
# ─────────────────────────────────────────────────────────────────────────────

def notify_painting_quote_sent(quote) -> None:
    """
    Tell the customer their painting/masonry quotation is ready to view.

    Bug found: two endpoints in views.py called `send_quote_notification(quote)`
    the moment a quote reached SENT_TO_CUSTOMER, but no such function existed
    anywhere in the codebase -- so submitting a quotation raised
    NameError and returned a 500, after the quote had already been saved.
    The customer was never told, and the vendor saw a server error on a
    request that had actually succeeded.

    Implemented here rather than by deleting the call, because the intent
    is unambiguous and every other customer-facing lifecycle event in this
    module is notified the same way. Gated on booking_confirmations for
    the same reason notify_customer_cancelled is: this app groups booking
    lifecycle events under that one preference, and adding a dedicated
    field would require a migration this fix does not need.
    """
    service_request = getattr(quote, "service_request", None)
    if service_request is None:
        return
    customer = getattr(service_request, "customer", None)
    customer_email = getattr(customer, "email", None) or service_request.email
    if not customer_email:
        return
    if not _customer_wants(customer, "booking_confirmations"):
        logger.info(
            "[Quote] Customer opted out of booking_confirmations -- skipping "
            "quote notification for %s.", getattr(quote, "quote_number", "?"),
        )
        return

    subject = f"Your quotation {getattr(quote, 'quote_number', '')} is ready"
    message = (
        f"Hello {service_request.customer_name or 'there'},\n\n"
        f"Your quotation for \"{service_request.issue_title}\" is ready to review.\n"
        f"Quotation: {getattr(quote, 'quote_number', '')}\n"
        f"Total: Rs. {getattr(quote, 'grand_total', '')}\n\n"
        f"You can review and accept it from your bookings page.\n"
    )
    try:
        send_mail(subject, message, None, [customer_email])
    except Exception as exc:
        logger.warning(
            "[Quote] Could not send quote notification for %s: %s",
            getattr(quote, "quote_number", "?"), exc,
        )


def notify_customer_cancelled(service_request, reason="") -> None:
    """
    Notify the customer that their booking has been cancelled (via SMS and email).
    """
    customer = getattr(service_request, "customer", None)
    tracking_url = build_customer_tracking_url(service_request)

    # 1. SMS cancellation notification with tracking URL
    phone = (getattr(service_request, "phone", "") or "").strip()
    if phone:
        sms_msg = f"SEVO: Booking {service_request.request_id} has been cancelled. Details: {tracking_url}"
        event_key = f"booking:{service_request.request_id}:booking-cancelled"
        try:
            send_sms_notification(
                mobile_number=phone,
                message=sms_msg,
                event_key=event_key,
                service_request=service_request,
                preference_field="booking_confirmations",
            )
        except Exception as sms_err:
            logger.warning("[Cancellation] Failed to send cancellation SMS for %s: %s", service_request.request_id, sms_err)

    # 2. Email cancellation notification
    customer_email = getattr(customer, "email", None) or service_request.email
    if not customer_email:
        return
    if not _customer_wants(customer, "booking_confirmations"):
        logger.info("[Cancellation] Customer opted out of booking_confirmations -- skipping cancellation notification for booking %s.", service_request.request_id)
        return

    subject = f"[sevo] Booking Cancelled — {service_request.request_id}"
    body = _render_html_template(
        title="Booking Cancelled",
        greeting=f"Hello {customer.get_full_name() if customer else 'Customer'},",
        intro_text="Your booking has been cancelled as requested.",
        details_dict={
            "Booking ID": service_request.request_id,
            "Service": service_request.issue_title,
            "Reason": reason or "Not specified",
        },
        cta_url=tracking_url,
        cta_text="View Booking Details",
        footer_note="If a payment was made for this booking, any applicable refund will be processed separately and you will be notified of its status.",
    )
    try:
        _sent = send_mail(
            subject,
            f"Your booking {service_request.request_id} has been cancelled. Details: {tracking_url}",
            settings.DEFAULT_FROM_EMAIL,
            [customer_email],
            html_message=body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[Cancellation] Customer cancellation notification sent to %s", customer_email)
        else:
            logger.error("[Cancellation] send_mail reported 0 messages delivered to %s for booking %s", customer_email, service_request.request_id)
    except Exception as exc:
        logger.error("[Cancellation] Failed to send cancellation notification: %s", exc)


def notify_customer_technician_delayed(service_request, reason="", delay_count=1, new_date=None) -> None:
    """
    Tell the customer their technician has reported a delay.

    Bug found (gap): the vendor app already let a technician report a delay
    (WorkforceJobRescheduleView) and stamped the resulting row
    customer_notified=True, but the only thing it actually created was a
    WorkforceNotification -- a row in the *vendor* app's own table. Nothing
    ever reached the customer app, so "customer notified" was recorded for a
    customer who was never told anything.

    Deliberately says only what the system actually knows: the technician
    reported a delay, and the reason they gave. It never attributes the delay
    to weather or traffic on its own, because there is no weather or traffic
    feed in this codebase to justify such a claim -- the reason shown is
    whatever the technician selected or typed.

    Gated on technician_updates, the existing preference covering
    technician-progress messages. Deduplicated against NotificationOutbox so a
    replayed or retried webhook cannot mail the customer about the same delay
    report twice; each distinct report carries an incrementing delay_count.
    """
    customer = getattr(service_request, "customer", None)
    customer_email = getattr(customer, "email", None) or service_request.email
    if not customer_email:
        return
    if not _customer_wants(customer, "technician_updates"):
        logger.info(
            "[Delay] Customer opted out of technician_updates -- skipping delay notification for booking %s.",
            service_request.request_id,
        )
        return

    subject = f"[sevo] Service Delay Update — {service_request.request_id} (#{delay_count})"

    # Persistent dedup: NotificationOutbox already records every send, so it
    # doubles as the "have we told them about this delay yet?" ledger without
    # needing a new field and migration.
    try:
        from .models import NotificationOutbox
        if NotificationOutbox.objects.filter(recipient=customer_email, subject=subject).exists():
            logger.info(
                "[Delay] Delay #%s for booking %s already notified -- not sending again.",
                delay_count, service_request.request_id,
            )
            return
    except Exception as exc:
        logger.warning("[Delay] Could not check notification history (sending anyway): %s", exc)

    details = {
        "Booking ID": service_request.request_id,
        "Service": service_request.issue_title,
        "Reason given": reason or "Not specified",
    }
    if new_date:
        details["Revised date"] = str(new_date)

    body = _render_html_template(
        title="Your technician is running late",
        greeting=f"Hello {customer.get_full_name() if customer else 'Customer'},",
        intro_text=(
            "Your technician has reported a delay and may reach you later than "
            "originally scheduled. We are sorry for the inconvenience."
        ),
        details_dict=details,
        footer_note="You can follow their live progress on your booking tracking page.",
    )
    try:
        _sent = send_mail(
            subject,
            f"Your technician for booking {service_request.request_id} has reported a delay. Reason: {reason or 'Not specified'}.",
            settings.DEFAULT_FROM_EMAIL,
            [customer_email],
            html_message=body,
            fail_silently=True,
        )
        if _sent:
            logger.info("[Delay] Technician delay notification sent to %s", customer_email)
        else:
            logger.error(
                "[Delay] send_mail reported 0 messages delivered to %s for booking %s",
                customer_email, service_request.request_id,
            )
    except Exception as exc:
        logger.error("[Delay] Failed to send technician delay notification: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Slice 3 — Refund Notifications
# ─────────────────────────────────────────────────────────────────────────────

def notify_refund_status_change(refund_request) -> None:
    """Notify customer on APPROVED, REJECTED, PROCESSED, FAILED."""
    customer = refund_request.requested_by
    if not customer.email:
        return
    if not _customer_wants(customer, "refund_updates"):
        logger.info("[Refund] Customer opted out of refund_updates -- skipping status notification for booking %s.", refund_request.booking.request_id)
        return

    status = refund_request.status
    booking = refund_request.booking
    subject = f"[sevo] Refund {status.title()} — {booking.request_id}"

    status_messages = {
        "APPROVED":  f"Your refund of ₹{refund_request.amount} for booking {booking.request_id} has been APPROVED and will be processed shortly.",
        "REJECTED":  f"Your refund request for booking {booking.request_id} has been REJECTED.\nNotes: {refund_request.admin_notes or 'N/A'}",
        "PROCESSED": f"Your refund of ₹{refund_request.amount} for booking {booking.request_id} has been PROCESSED.\nReference: {refund_request.gateway_reference or 'N/A'}",
        "FAILED":    f"Your refund for booking {booking.request_id} FAILED to process. Our team will retry.\nNotes: {refund_request.admin_notes or 'N/A'}",
    }
    body = status_messages.get(status, f"Your refund request status is now: {status}.")

    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer.email], fail_silently=True)
        if _sent:
            logger.info("[Refund] Status notification sent to %s — %s", customer.email, status)
        else:
            logger.error("[Refund] send_mail reported 0 messages delivered to %s — %s", customer.email, status)
    except Exception as exc:
        logger.error("[Refund] Failed to send status notification: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Slice 4 — Complaint Notifications
# ─────────────────────────────────────────────────────────────────────────────

def notify_complaint_created(complaint) -> None:
    """Notify admin when a new complaint is created."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Get admin from same company as the linked booking (if any)
    admin = None
    if complaint.booking and complaint.booking.company:
        admin = User.objects.filter(company=complaint.booking.company, role__in=["admin", "manager"]).first()
    if not admin:
        admin = User.objects.filter(role__in=["admin", "manager"]).first()

    if not admin or not admin.email:
        return

    customer = complaint.raised_by
    booking_ref = complaint.booking.request_id if complaint.booking else "General"
    subject = f"[sevo] New Complaint — {complaint.get_category_display()} (Booking: {booking_ref})"
    body = (
        f"A new complaint has been filed.\n\n"
        f"Category: {complaint.get_category_display()}\n"
        f"Customer: {customer.get_full_name() or customer.email}\n"
        f"Booking: {booking_ref}\n"
        f"Description: {complaint.description}\n\n"
        f"Please review in the admin panel."
    )
    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [admin.email], fail_silently=True)
        if _sent:
            logger.info("[Complaint] Created notification sent to %s", admin.email)
        else:
            logger.error("[Complaint] send_mail reported 0 messages delivered (created) to %s", admin.email)
    except Exception as exc:
        logger.error("[Complaint] Failed to send created notification: %s", exc)


def notify_complaint_status_change(complaint) -> None:
    """Notify customer when complaint status changes."""
    customer_email = complaint.raised_by.email
    if not customer_email:
        return
    if not _customer_wants(complaint.raised_by, "complaint_updates"):
        logger.info("[Complaint] Customer opted out of complaint_updates -- skipping status change notification.")
        return

    subject = f"[sevo] Complaint Update — {complaint.get_status_display()}"
    body = (
        f"Your complaint has been updated.\n\n"
        f"Category: {complaint.get_category_display()}\n"
        f"New Status: {complaint.get_status_display()}\n"
        f"Resolution Notes: {complaint.resolution_notes or 'N/A'}"
    )
    try:
        _sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [customer_email], fail_silently=True)
        if not _sent:
            logger.error("[Complaint] send_mail reported 0 messages delivered (status change) to %s", customer_email)
    except Exception as exc:
        logger.error("[Complaint] Failed to send status change notification: %s", exc)


def notify_complaint_response(complaint, response) -> None:
    """Notify customer (and employee if relevant) when a new response is added."""
    recipients = set()

    # Notify customer unless the responder IS the customer
    customer_email = complaint.raised_by.email
    if (
        customer_email
        and response.responder_id != complaint.raised_by_id
        and _customer_wants(complaint.raised_by, "complaint_updates")
    ):
        recipients.add(customer_email)

    # If response is from admin/customer, notify assigned employee
    if complaint.assigned_employee and complaint.assigned_employee.user.email:
        if response.persona in ("ADMIN", "CUSTOMER"):
            recipients.add(complaint.assigned_employee.user.email)

    for email in recipients:
        try:
            _sent = send_mail(
                f"[sevo] New Response on Your Complaint",
                f"A new response has been added to your complaint.\n\n{response.message}",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=True,
            )
            if not _sent:
                logger.error("[Complaint] send_mail reported 0 messages delivered (response) to %s", email)
        except Exception as exc:
            logger.error("[Complaint] Failed to send response notification: %s", exc)


def notify_complaint_assigned(complaint) -> None:
    """Notify assigned employee that a complaint has been assigned to them."""
    if not complaint.assigned_employee:
        return
    emp_email = getattr(complaint.assigned_employee.user, "email", None)
    if not emp_email:
        return

    customer = complaint.raised_by
    try:
        _sent = send_mail(
            "[sevo] Complaint Assigned To You",
            (
                f"A complaint has been assigned to you.\n\n"
                f"Category: {complaint.get_category_display()}\n"
                f"Customer: {customer.get_full_name() or customer.email}\n"
                f"Description: {complaint.description}\n\n"
                f"Please review and respond via the app."
            ),
            settings.DEFAULT_FROM_EMAIL,
            [emp_email],
            fail_silently=True,
        )
        if _sent:
            logger.info("[Complaint] Assignment notification sent to %s", emp_email)
        else:
            logger.error("[Complaint] send_mail reported 0 messages delivered (assignment) to %s", emp_email)
    except Exception as exc:
        logger.error("[Complaint] Failed to send assignment notification: %s", exc)


def broadcast_tracking_event(service_request, event_type="job_updated", custom_data=None) -> None:
    """
    Broadcasts real-time events to all WebSocket clients connected to the tracking session
    for this service request.
    """
    try:
        # Was: `if "test" in sys.argv: return` -- a hard no-op whenever the
        # word "test" appeared anywhere in the process arguments. That made
        # every WebSocket broadcast unreachable under `manage.py test`, which
        # is why the two tests covering the live-tracking bridge could only
        # ever time out: the code they exercise was switched off by the fact
        # that they were running. It is also a production branch keyed on
        # argv, so any process launched with "test" in its arguments would
        # silently lose live tracking with no error anywhere.
        #
        # Replaced with an explicit setting so the behaviour is chosen
        # deliberately rather than inferred from a command line. Defaults to
        # broadcasting, i.e. the same behaviour as production today.
        if not getattr(settings, "TRACKING_BROADCAST_ENABLED", True):
            return

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if not channel_layer or not service_request:
            return

        from service_requests.views import _build_tracking_payload
        payload = custom_data or _build_tracking_payload(service_request, has_full_access=True)

        group_names = [
            f"tracking_{service_request.id}",
            f"tracking_{service_request.request_id}",
        ]
        if service_request.tracking_token:
            group_names.append(f"tracking_{service_request.tracking_token}")

        for g in group_names:
            async_to_sync(channel_layer.group_send)(
                g,
                {
                    "type": event_type,
                    "data": payload,
                }
            )
    except Exception as e:
        logger.warning("[Tracking WS] Failed to broadcast event %s for SR %s: %s", event_type, getattr(service_request, "request_id", None), e)

