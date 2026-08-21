import datetime
import zoneinfo
from django.utils import timezone
from django.db.models import Q, Count, Sum, Max, F
from django.contrib.auth import get_user_model
from service_requests.models import ServiceRequest
from customer_analytics.models import CustomerIdentity

User = get_user_model()
TZ_KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")


def parse_date_range(period, from_str=None, to_str=None):
    """
    Parses period string or explicit date ranges into start/end dates in Asia/Kolkata.
    """
    local_now = timezone.now().astimezone(TZ_KOLKATA)
    local_today = local_now.date()

    if period == "today":
        start = local_today
        end = local_today
    elif period == "week":
        start = local_today - datetime.timedelta(days=local_today.weekday())
        end = start + datetime.timedelta(days=6)
    elif period == "month":
        start = local_today.replace(day=1)
        next_month = (start + datetime.timedelta(days=32)).replace(day=1)
        end = next_month - datetime.timedelta(days=1)
    elif period == "quarter":
        quarter = (local_today.month - 1) // 3 + 1
        start = datetime.date(local_today.year, (quarter - 1) * 3 + 1, 1)
        next_quarter_month = quarter * 3 + 1
        if next_quarter_month > 12:
            next_quarter_end = datetime.date(local_today.year + 1, 1, 1)
        else:
            next_quarter_end = datetime.date(local_today.year, next_quarter_month, 1)
        end = next_quarter_end - datetime.timedelta(days=1)
    elif period == "year":
        start = datetime.date(local_today.year, 1, 1)
        end = datetime.date(local_today.year, 12, 31)
    elif from_str or to_str:
        start = datetime.date.fromisoformat(from_str) if from_str else datetime.date(2020, 1, 1)
        end = datetime.date.fromisoformat(to_str) if to_str else local_today
    else:
        # Default to last 30 days
        start = local_today - datetime.timedelta(days=30)
        end = local_today

    return start, end


def parse_analytics_filters(request):
    """
    Extracts common analytics filters from query parameters.
    """
    params = request.query_params
    
    # 1. Date Range
    period = params.get("period")
    from_str = params.get("from")
    to_str = params.get("to")
    start, end = parse_date_range(period, from_str, to_str)
    
    # Granularity
    granularity = params.get("granularity", "day")
    if granularity not in ["day", "week", "month"]:
        granularity = "day"
        
    # 2. Base Query Filters
    q_filter = Q()
    
    # Scope to tenant company
    company = getattr(request, "company", None)
    if company:
        q_filter &= Q(company=company)
        
    # Free-text query
    q = params.get("q", "").strip()
    if q:
        q_filter &= (
            Q(customer_name__icontains=q) |
            Q(phone__icontains=q) |
            Q(email__icontains=q) |
            Q(request_id__icontains=q) |
            Q(customer__customer_id__icontains=q)
        )
        
    # Statuses
    statuses = params.getlist("status[]") or params.getlist("status")
    if statuses:
        q_filter &= Q(status__in=statuses)
        
    # Categories
    categories = params.getlist("category[]") or params.getlist("category")
    if categories:
        q_filter &= Q(service_category__in=categories)
        
    # Payment State
    payment_state = params.get("payment_state")
    if payment_state == "owes":
        q_filter &= Q(
            status__in=["completed", "closed", "verified"],
            payment_status__in=["pending", "failed"],
            payment_collected_at__isnull=True
        )
    elif payment_state == "technician_holds":
        q_filter &= Q(payment_status="collected")
    elif payment_state == "settled":
        q_filter &= Q(payment_status__in=["paid", "refunded"])
    elif payment_state == "expected":
        q_filter &= Q(status="confirmed", payment_method="COD", payment_status="pending")

    return {
        "start_date": start,
        "end_date": end,
        "granularity": granularity,
        "q_filter": q_filter,
    }


def get_annotated_customers(request):
    """
    Returns an annotated queryset of CustomerUser rows based on filters.
    """
    from customer_analytics.models import CustomerUser
    params = request.query_params
    company = getattr(request, "company", None)
    
    from django.db.models.functions import Coalesce
    
    # Base query from customer_users table
    qs = CustomerUser.objects.all()
    qs = qs.annotate(
        display_customer_id=Coalesce("user__customer_identity__id", "id")
    )
    if company:
        qs = qs.filter(company=company)
        
    # Preserving existing deduplication functionality:
    # Filter out users that have been merged in CustomerIdentity
    qs = qs.filter(user__customer_identity__merged_into__isnull=True)
        
    # Annotate metrics live
    # Count of bookings and sum of value
    # Filter bookings by company if present
    booking_filter = Q(user__service_requests_as_customer__company=company) if company else Q()
    
    qs = qs.annotate(
        total_bookings=Count("user__service_requests_as_customer", filter=booking_filter),
        completed_bookings=Count(
            "user__service_requests_as_customer",
            filter=booking_filter & Q(user__service_requests_as_customer__status__in=["completed", "closed", "verified"])
        ),
        cancelled_bookings=Count(
            "user__service_requests_as_customer",
            filter=booking_filter & Q(user__service_requests_as_customer__status="cancelled")
        ),
        pending_bookings=Count(
            "user__service_requests_as_customer",
            filter=booking_filter & Q(user__service_requests_as_customer__status__in=[
                "new_request", "pending_payment", "waiting_for_payment", "confirmed", "reviewed", 
                "assigned", "received", "accepted", "on_the_way", "arrived", "in_progress", "rework_requested"
            ])
        ),
        total_spent=Sum(
            "user__service_requests_as_customer__total_amount",
            filter=booking_filter & Q(user__service_requests_as_customer__payment_status__in=["paid", "collected"])
        ),
        outstanding_amount=Sum(
            "user__service_requests_as_customer__total_amount",
            filter=booking_filter & Q(
                user__service_requests_as_customer__status__in=["completed", "closed", "verified"],
                user__service_requests_as_customer__payment_status__in=["pending", "failed"],
                user__service_requests_as_customer__payment_collected_at__isnull=True
            )
        ),
        last_booking_date=Max("user__service_requests_as_customer__created_at"),
        last_login_date=Max("user__customer_logins__occurred_at"),
    )
    
    # Apply filters
    q = params.get("q", "").strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q) |
            Q(phone__icontains=q) |
            Q(email__icontains=q) |
            Q(user__username__icontains=q) |
            Q(user__customer_id__icontains=q)
        )
        
    # Is repeat customer
    is_repeat = params.get("is_repeat")
    if is_repeat == "true":
        qs = qs.filter(total_bookings__gte=2)
    elif is_repeat == "false":
        qs = qs.filter(total_bookings__lt=2)
        
    # Churn Risk
    # at_risk = last booking 60–120 days ago
    # churned = >120 days ago
    churn_risk = params.get("churn_risk")
    if churn_risk in ["at_risk", "churned"]:
        now = timezone.now()
        at_risk_cutoff = now - datetime.timedelta(days=60)
        churned_cutoff = now - datetime.timedelta(days=120)
        
        if churn_risk == "at_risk":
            qs = qs.filter(
                last_booking_date__lte=at_risk_cutoff,
                last_booking_date__gt=churned_cutoff,
                total_bookings__gte=1
            )
        elif churn_risk == "churned":
            qs = qs.filter(
                last_booking_date__lte=churned_cutoff,
                total_bookings__gte=1
            )
            
    # Sorting
    sort_param = params.get("sort", "-last_booking_at")
    if sort_param == "bookings":
        qs = qs.order_by("total_bookings", "display_customer_id")
    elif sort_param == "-bookings":
        qs = qs.order_by("-total_bookings", "-display_customer_id")
    elif sort_param == "value":
        qs = qs.order_by("total_spent", "display_customer_id")
    elif sort_param == "-value":
        qs = qs.order_by("-total_spent", "-display_customer_id")
    elif sort_param == "last_booking_at":
        qs = qs.order_by("last_booking_date", "display_customer_id")
    elif sort_param == "-last_booking_at":
        qs = qs.order_by("-last_booking_date", "-display_customer_id")
    else:
        # Default fallback
        qs = qs.order_by("-last_booking_date", "-display_customer_id")
        
    return qs
