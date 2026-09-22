import os
import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def send_dispatch_notifications(customer_name, phone_number, email_address, subject, message):
    """
    Sends notification via SMS, Email, and WhatsApp to the customer.
    Prints simulated SMS and WhatsApp in the dev console.
    """
    # 1. Dispatch Email
    if email_address:
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_address.strip()],
                fail_silently=True
            )
            logger.info(f"[Care Notification] Email successfully sent to {email_address}")
        except Exception as e:
            logger.error(f"[Care Notification] Email delivery failed for {email_address}: {e}")

    # 2. Dispatch SMS
    if phone_number:
        normalized_phone = phone_number.strip()
        sent_real_sms = False
        delivery_error = ""

        try:
            from twilio.rest import Client as TwilioClient
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            from_number = os.getenv("TWILIO_FROM_NUMBER")

            if account_sid and auth_token and from_number and not account_sid.startswith("your_"):
                client = TwilioClient(account_sid, auth_token)
                client.messages.create(
                    body=message,
                    from_=from_number,
                    to=normalized_phone
                )
                sent_real_sms = True
        except ImportError:
            delivery_error = "Twilio client library not installed"
        except Exception as e:
            delivery_error = str(e)

        print("\n" + "=" * 80)
        print(f"  [CUSTOMER SMS GATEWAY] Message for {normalized_phone}:")
        print(f"  {message}")
        if delivery_error:
            print(f"  [CUSTOMER SMS GATEWAY] Real SMS skipped/failed ({delivery_error})")
        print("=" * 80 + "\n")

    # 3. Dispatch WhatsApp
    if phone_number:
        normalized_phone = phone_number.strip()
        sent_real_wa = False
        delivery_error_wa = ""

        try:
            from twilio.rest import Client as TwilioClient
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            from_number = os.getenv("TWILIO_FROM_NUMBER")

            if account_sid and auth_token and from_number and not account_sid.startswith("your_"):
                # Use whatsapp: prefix for Twilio WhatsApp API
                from_wa = f"whatsapp:{from_number}"
                to_wa = f"whatsapp:{normalized_phone}"
                client = TwilioClient(account_sid, auth_token)
                client.messages.create(
                    body=message,
                    from_=from_wa,
                    to=to_wa
                )
                sent_real_wa = True
        except ImportError:
            delivery_error_wa = "Twilio client library not installed"
        except Exception as e:
            delivery_error_wa = str(e)

        print("\n" + "=" * 80)
        print(f"  [CUSTOMER WHATSAPP GATEWAY] Message for {normalized_phone}:")
        print(f"  {message}")
        if delivery_error_wa:
            print(f"  [CUSTOMER WHATSAPP GATEWAY] Real WhatsApp skipped/failed ({delivery_error_wa})")
        print("=" * 80 + "\n")


def notify_reschedule_processed(ticket, reschedule_request, approved):
    """
    Send reschedule notification to the customer.
    """
    customer_name = ticket.customer_name or "Valued Customer"
    booking_id = reschedule_request.booking.request_id if reschedule_request.booking else "N/A"
    
    if approved:
        subject = f"Appointment Rescheduled Successfully - {booking_id}"
        message = (
            f"Dear {customer_name},\n\n"
            f"We are pleased to inform you that your request to reschedule service booking {booking_id} has been APPROVED.\n\n"
            f"New Appointment Date: {reschedule_request.new_date}\n"
            f"New Appointment Slot: {reschedule_request.new_time_slot}\n\n"
            f"Thank you for choosing Sevo!"
        )
    else:
        subject = f"Reschedule Request Update - {booking_id}"
        message = (
            f"Dear {customer_name},\n\n"
            f"We regret to inform you that your request to reschedule service booking {booking_id} could not be approved at this time.\n\n"
            f"Reason/Notes: {reschedule_request.review_notes or 'Schedule conflict or technician unavailable.'}\n\n"
            f"Please contact our support desk or log in to select another time slot. We apologize for the inconvenience."
        )

    send_dispatch_notifications(
        customer_name=customer_name,
        phone_number=ticket.phone,
        email_address=ticket.email,
        subject=subject,
        message=message
    )


def notify_cancellation_processed(ticket, cancellation_request, approved):
    """
    Send cancellation notification to the customer.
    """
    customer_name = ticket.customer_name or "Valued Customer"
    booking_id = cancellation_request.booking.request_id if cancellation_request.booking else "N/A"
    
    if approved:
        subject = f"Booking Cancelled Successfully - {booking_id}"
        message = (
            f"Dear {customer_name},\n\n"
            f"Your service booking {booking_id} has been successfully CANCELLED as per your request.\n\n"
            f"If you have already paid for this booking, a refund request has been initiated and is being processed by our team.\n\n"
            f"We are sorry to see you go and hope to serve you again in the future."
        )
    else:
        subject = f"Cancellation Request Rejected - {booking_id}"
        message = (
            f"Dear {customer_name},\n\n"
            f"We would like to let you know that your request to cancel service booking {booking_id} has been declined.\n\n"
            f"Please reach out to support for any queries or clarification."
        )

    send_dispatch_notifications(
        customer_name=customer_name,
        phone_number=ticket.phone,
        email_address=ticket.email,
        subject=subject,
        message=message
    )


def notify_ticket_resolved(ticket):
    """
    Send polite resolution notification based on the ticket category.
    """
    customer_name = ticket.customer_name or "Valued Customer"
    ticket_num = ticket.ticket_number
    category = (ticket.category or "").lower()
    
    # Customize message based on the ticket category
    if category in ["payment_issue", "refund", "pricing_issue"]:
        message_body = (
            "your billing or payment query has been fully resolved by our billing department. "
            "Any adjustments or invoice revisions have been updated in your profile."
        )
    elif category in ["booking_issue", "reschedule", "cancellation"]:
        message_body = (
            "your booking/scheduling request has been processed and confirmed with our dispatch team. "
            "Your appointment details are updated."
        )
    elif category in ["service_quality", "technician_issue", "missing_damaged", "safety_issue"]:
        message_body = (
            "we have fully reviewed your feedback/complaint regarding the service quality or staff behavior "
            "and taken the necessary corrective actions. We deeply value your input."
        )
    else:
        message_body = (
            "your support request has been successfully resolved. Our team has completed "
            "the required actions to resolve the issue to your satisfaction."
        )

    subject = f"Support Ticket Resolved: {ticket_num}"
    message = (
        f"Dear {customer_name},\n\n"
        f"This is to notify you that {message_body}\n\n"
        f"Ticket details:\n"
        f"- Ticket Number: {ticket_num}\n"
        f"- Status: RESOLVED\n\n"
        f"Thank you for choosing Sevo! Please let us know if there is anything else we can do for you."
    )

    send_dispatch_notifications(
        customer_name=customer_name,
        phone_number=ticket.phone,
        email_address=ticket.email,
        subject=subject,
        message=message
    )
