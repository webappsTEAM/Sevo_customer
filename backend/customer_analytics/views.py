import csv
import datetime
import hashlib
from django.http import HttpResponse
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Q, Count, Sum, Max, Avg, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from accounts.permissions import IsAdminRole, RequireModuleAccess
from accounts.models import User, SavedAddress
from service_requests.models import ServiceRequest, Complaint, ServiceFeedback
from customer_care.models import CustomerCareTicket
from customer_analytics.models import CustomerIdentity, CustomerLoginEvent, BookingStatusEvent, AuditLog
from customer_analytics.filters import parse_analytics_filters, get_annotated_customers, TZ_KOLKATA


class CustomerListView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "view")]

    def get(self, request):
        page_num = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 25)

        customers_qs = get_annotated_customers(request)
        paginator = Paginator(customers_qs, page_size)
        page = paginator.get_page(page_num)

        results = []
        for ident in page:
            identity_id = getattr(ident.user, "customer_identity", None)
            if not identity_id:
                from customer_analytics.models import CustomerIdentity
                raw_phone = getattr(ident.user, "phone", "") or ""
                import re
                cleaned = re.sub(r"[^\d+]", "", str(raw_phone))
                if cleaned and not cleaned.startswith("+"):
                    if len(cleaned) == 10:
                        cleaned = f"+91{cleaned}"
                    elif cleaned.startswith("91") and len(cleaned) == 12:
                        cleaned = f"+{cleaned}"
                    else:
                        cleaned = f"+{cleaned}"
                try:
                    identity_id, _ = CustomerIdentity.objects.get_or_create(
                        user=ident.user,
                        defaults={
                            "company": ident.company,
                            "phone_normalized": cleaned,
                            "email_normalized": ident.user.email or ""
                        }
                    )
                except Exception:
                    pass

            results.append({
                "id": identity_id.id if identity_id else ident.display_customer_id,
                "user_id": ident.user.id,
                "customer_id": getattr(ident.user, "customer_id", None),
                "name": ident.name or ident.user.get_full_name() or ident.user.username,
                "email": ident.email or ident.user.email or "",
                "phone": ident.phone or ident.user.phone or "",
                "total_bookings": ident.total_bookings,
                "completed_bookings": ident.completed_bookings,
                "cancelled_bookings": ident.cancelled_bookings,
                "pending_bookings": ident.pending_bookings,
                "total_spent": float(ident.total_spent or 0),
                "outstanding_amount": float(ident.outstanding_amount or 0),
                "last_booking_at": ident.last_booking_date.isoformat() if ident.last_booking_date else None,
                "last_login_at": ident.last_login_date.isoformat() if ident.last_login_date else None,
            })

        return Response({
            "success": True,
            "data": {
                "results": results,
                "count": paginator.count,
                "num_pages": paginator.num_pages,
                "current_page": int(page_num),
            }
        })


class CustomerDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "view")]

    def get(self, request, pk):
        identity = (
            CustomerIdentity.objects.filter(pk=pk, merged_into__isnull=True).first() or
            CustomerIdentity.objects.filter(user_id=pk, merged_into__isnull=True).first() or
            CustomerIdentity.objects.filter(user__customer_id=pk, merged_into__isnull=True).first()
        )
        if not identity:
            user = User.objects.filter(Q(id=pk) | Q(customer_id=pk)).first()
            if user:
                identity, _ = CustomerIdentity.objects.get_or_create(
                    user=user,
                    defaults={
                        "phone_normalized": user.phone or "",
                        "email_normalized": user.email or "",
                    }
                )
            else:
                return Response({"success": False, "message": "Customer not found"}, status=404)

        user = identity.user

        # Profile Overview with orthogonal status
        profile = {
            "id": identity.id,
            "user_id": user.id,
            "customer_id": getattr(user, "customer_id", None),
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "email": identity.email_normalized or user.email or "",
            "phone": identity.phone_normalized or user.phone or "",
            "account_status": identity.account_status,
            "customer_tier": identity.customer_tier,
            "risk_status": identity.risk_status,
            "internal_notes": identity.internal_notes,
            "tags": identity.tags or [],
            "joined_at": user.date_joined.isoformat() if user.date_joined else "",
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }

        # Saved Addresses
        addresses = []
        for addr in user.saved_addresses.all():
            addresses.append({
                "id": addr.id,
                "label": addr.label,
                "address_line1": addr.address_line1,
                "address_line2": addr.address_line2,
                "city": addr.city,
                "state": addr.state,
                "pincode": addr.pincode,
                "phone_number": addr.phone_number,
            })

        # Bookings & Value Rollup Calculations
        bookings_qs = ServiceRequest.objects.filter(customer=user)
        total_bookings = bookings_qs.count()
        completed_bookings = bookings_qs.filter(status__in=["completed", "closed", "verified"]).count()
        cancelled_bookings = bookings_qs.filter(status="cancelled").count()
        
        revenue_sum = bookings_qs.filter(payment_status__in=["paid", "collected"]).aggregate(total=Sum("total_amount"))["total"]
        total_spent = float(revenue_sum or 0)

        outstanding_sum = bookings_qs.filter(
            status__in=["completed", "closed", "verified"],
            payment_status__in=["pending", "failed"],
            payment_collected_at__isnull=True
        ).aggregate(total=Sum("total_amount"))["total"]
        outstanding_amount = float(outstanding_sum or 0)

        rollups = {
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "total_spent": total_spent,
            "outstanding_amount": outstanding_amount,
        }

        # Recent Bookings (last 5)
        recent_bookings = []
        for b in bookings_qs.order_by("-created_at")[:5]:
            recent_bookings.append({
                "id": b.id,
                "request_id": b.request_id,
                "service_category": b.service_category,
                "issue_title": b.issue_title,
                "status": b.status,
                "payment_status": b.payment_status,
                "total_amount": float(b.total_amount),
                "created_at": b.created_at.isoformat(),
            })

        # Payment Ledger
        payments = []
        for b in bookings_qs.exclude(payment_status="pending").order_by("-created_at")[:10]:
            payments.append({
                "booking_id": b.request_id,
                "payment_method": b.payment_method,
                "payment_status": b.payment_status,
                "total_amount": float(b.total_amount),
                "payment_collected_at": b.payment_collected_at.isoformat() if b.payment_collected_at else None,
                "transaction_id": b.transaction_id or "",
            })

        # Login History
        logins = []
        for log in CustomerLoginEvent.objects.filter(customer=user).order_by("-occurred_at")[:5]:
            logins.append({
                "method": log.method,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "status": log.status,
                "occurred_at": log.occurred_at.isoformat(),
            })

        # Support Tickets
        tickets = []
        for t in CustomerCareTicket.objects.filter(customer=user).order_by("-created_at")[:5]:
            tickets.append({
                "id": t.id,
                "ticket_number": t.ticket_number,
                "category": t.category,
                "priority": t.priority,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            })

        # Complaints
        complaints = []
        for c in Complaint.objects.filter(raised_by=user).order_by("-created_at")[:5]:
            complaints.append({
                "id": c.id,
                "issue_type": c.category,
                "status": c.status,
                "created_at": c.created_at.isoformat(),
            })

        # Feedback
        feedbacks = []
        for f in ServiceFeedback.objects.filter(service_request__customer=user).order_by("-submitted_at")[:5]:
            feedbacks.append({
                "id": f.id,
                "rating": f.rating,
                "comments": f.comment or "",
                "created_at": f.submitted_at.isoformat() if f.submitted_at else None,
            })

        return Response({
            "success": True,
            "data": {
                "profile": profile,
                "addresses": addresses,
                "rollups": rollups,
                "recent_bookings": recent_bookings,
                "payment_ledger": payments,
                "login_history": logins,
                "support_tickets": tickets,
                "complaints": complaints,
                "feedback": feedbacks,
            }
        })


class CustomerTimelineView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "view")]

    def get(self, request, pk):
        identity = (
            CustomerIdentity.objects.filter(pk=pk, merged_into__isnull=True).first() or
            CustomerIdentity.objects.filter(user_id=pk, merged_into__isnull=True).first() or
            CustomerIdentity.objects.filter(user__customer_id=pk, merged_into__isnull=True).first()
        )
        if not identity:
            user = User.objects.filter(Q(id=pk) | Q(customer_id=pk)).first()
            if not user:
                return Response({"success": False, "message": "Customer not found"}, status=404)
        else:
            user = identity.user

        # Fetch chronological items (logins, bookings, status events, tickets)
        timeline = []

        # 1. Booking Status Events
        events_qs = BookingStatusEvent.objects.filter(customer=user).order_by("-occurred_at")[:25]
        for e in events_qs:
            timeline.append({
                "type": "status_event",
                "timestamp": e.occurred_at.isoformat(),
                "details": f"Booking {e.service_request.request_id} transitioned from '{e.from_status}' to '{e.to_status}' by {e.actor_persona}.",
                "reason_code": e.reason_code,
                "reason_note": e.reason_note,
            })

        # 2. Bookings Created
        bookings_qs = ServiceRequest.objects.filter(customer=user).order_by("-created_at")[:25]
        for b in bookings_qs:
            timeline.append({
                "type": "booking_created",
                "timestamp": b.created_at.isoformat(),
                "details": f"Booking {b.request_id} created for category '{b.service_category}' totaling ₹{b.total_amount}.",
            })

        # 3. Customer Logins
        logins_qs = CustomerLoginEvent.objects.filter(customer=user).order_by("-occurred_at")[:25]
        for log in logins_qs:
            timeline.append({
                "type": "login",
                "timestamp": log.occurred_at.isoformat(),
                "details": f"Log in attempt via {log.method} [{log.status}] from IP: {log.ip_address or 'unknown'}.",
            })

        # 4. Care Tickets
        tickets_qs = CustomerCareTicket.objects.filter(customer=user).order_by("-created_at")[:25]
        for t in tickets_qs:
            timeline.append({
                "type": "care_ticket",
                "timestamp": t.created_at.isoformat(),
                "details": f"Customer care ticket #{t.ticket_number} created (Category: {t.category}, Status: {t.status}).",
            })

        # Sort combined timeline by timestamp descending
        timeline.sort(key=lambda x: x["timestamp"], reverse=True)

        return Response({
            "success": True,
            "data": timeline[:30]  # Limit to top 30 merged results
        })


class CustomerAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "view")]

    def get(self, request):
        company = getattr(request, "company", None)
        
        # 1. Parse Filter context
        filters = parse_analytics_filters(request)
        start = filters["start_date"]
        end = filters["end_date"]
        granularity = filters["granularity"]
        q_filter = filters["q_filter"]

        # Cache implementation
        filter_hash = hashlib.md5(f"{start}_{end}_{granularity}_{q_filter}".encode()).hexdigest()
        cache_key = f"customer_analytics_{company.id if company else 'all'}_{filter_hash}"
        
        bypass_cache = request.query_params.get("refresh") == "true"
        if not bypass_cache:
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)

        # Booking Queryset in range
        bookings_in_range = ServiceRequest.objects.filter(
            q_filter & Q(created_at__date__gte=start, created_at__date__lte=end)
        )
        total_bookings = bookings_in_range.count()
        completed_bookings = bookings_in_range.filter(status__in=["completed", "closed", "verified"]).count()
        cancelled_bookings = bookings_in_range.filter(status="cancelled").count()
        
        cancellation_rate = (cancelled_bookings / total_bookings * 100.0) if total_bookings > 0 else 0.0

        # Outstanding calculation
        outstanding_sum = bookings_in_range.filter(
            status__in=["completed", "closed", "verified"],
            payment_status__in=["pending", "failed"],
            payment_collected_at__isnull=True
        ).aggregate(total=Sum("total_amount"))["total"]
        outstanding_amount = float(outstanding_sum or 0)

        # Customer Counts
        # D1: New customer = customer whose first booking falls within period P
        all_bookings = ServiceRequest.objects.all()
        if company:
            all_bookings = all_bookings.filter(company=company)

        # Get first booking date per user
        first_bookings = all_bookings.values("customer_id").annotate(first_booking=Max("created_at")).order_by()
        # Find which users have first booking in range
        new_customer_ids = []
        active_customer_ids = set()

        # Simple python loop (optimized since users are limited)
        user_first_booking = {}
        for b in all_bookings.values("customer_id", "created_at"):
            c_id = b["customer_id"]
            if not c_id:
                continue
            date_val = b["created_at"].astimezone(TZ_KOLKATA).date()
            if c_id not in user_first_booking or date_val < user_first_booking[c_id]:
                user_first_booking[c_id] = date_val

            # Also trace active in period
            if start <= date_val <= end:
                active_customer_ids.add(c_id)

        for c_id, f_date in user_first_booking.items():
            if start <= f_date <= end:
                new_customer_ids.append(c_id)

        new_customers_count = len(new_customer_ids)
        active_customers_count = len(active_customer_ids)

        # Repeat % calculation: users with total bookings >= 2 / total users
        repeat_customers_count = 0
        total_customers_count = len(user_first_booking)
        user_booking_counts = all_bookings.values("customer_id").annotate(cnt=Count("id")).order_by()
        for ubc in user_booking_counts:
            if ubc["customer_id"] and ubc["cnt"] >= 2:
                repeat_customers_count += 1
        
        repeat_pct = (repeat_customers_count / total_customers_count * 100.0) if total_customers_count > 0 else 0.0

        # Prior Period comparison (for deltas)
        period_days = (end - start).days + 1
        prior_start = start - datetime.timedelta(days=period_days)
        prior_end = start - datetime.timedelta(days=1)

        prior_bookings = ServiceRequest.objects.filter(
            q_filter & Q(created_at__date__gte=prior_start, created_at__date__lte=prior_end)
        )
        prior_bookings_count = prior_bookings.count()
        prior_cancelled = prior_bookings.filter(status="cancelled").count()
        prior_cancellation_rate = (prior_cancelled / prior_bookings_count * 100.0) if prior_bookings_count > 0 else 0.0

        # Growth Series
        if granularity == "month":
            series_trunc = TruncMonth("created_at", tzinfo=TZ_KOLKATA)
        elif granularity == "week":
            series_trunc = TruncWeek("created_at", tzinfo=TZ_KOLKATA)
        else:
            series_trunc = TruncDay("created_at", tzinfo=TZ_KOLKATA)

        series_data = bookings_in_range.annotate(bucket=series_trunc).values("bucket").annotate(
            bookings=Count("id"),
            revenue=Sum("total_amount")
        ).order_by("bucket")

        chart_labels = []
        chart_bookings = []
        chart_revenue = []
        
        for sd in series_data:
            chart_labels.append(sd["bucket"].date().isoformat())
            chart_bookings.append(sd["bookings"])
            chart_revenue.append(float(sd["revenue"] or 0))

        # Cancellation Reason Chart Data
        cancel_reasons = bookings_in_range.filter(status="cancelled").values("cancellation_reason").annotate(
            count=Count("id")
        ).order_by("-count")

        cancellation_chart = {
            "labels": [cr["cancellation_reason"] or "Other" for cr in cancel_reasons],
            "data": [cr["count"] for cr in cancel_reasons]
        }

        # Category Mix Chart Data
        category_mix = bookings_in_range.values("service_category").annotate(
            count=Count("id")
        ).order_by("-count")

        category_chart = {
            # Fix (GT audit): str.title() does not strip underscores, so a
            # category key like "goods_transport_truck" rendered on the
            # admin dashboard's Category Mix chart as the raw slug
            # "Goods_Transport_Truck" instead of a readable label. Replace
            # underscores with spaces first, matching the same fallback
            # already used by reports/views.py's category breakdown.
            "labels": [str(cm["service_category"] or "").replace("_", " ").title() for cm in category_mix],
            "data": [cm["count"] for cm in category_mix]
        }

        # Abandonment Rate (Section D6: reached draft or pending_payment, never confirmed, older than 24h)
        cutoff_24h = timezone.now() - datetime.timedelta(hours=24)
        abandoned_bookings = all_bookings.filter(
            status__in=["draft", "pending_payment"],
            created_at__lte=cutoff_24h
        ).count()
        total_attempts = all_bookings.count()
        abandonment_rate = (abandoned_bookings / total_attempts * 100.0) if total_attempts > 0 else 0.0

        payload = {
            "success": True,
            "data": {
                "summary": {
                    "new_customers": new_customers_count,
                    "active_customers": active_customers_count,
                    "repeat_pct": round(repeat_pct, 1),
                    "bookings_count": total_bookings,
                    "cancellation_rate": round(cancellation_rate, 1),
                    "outstanding_revenue": outstanding_amount,
                },
                "deltas": {
                    "bookings_delta": total_bookings - prior_bookings_count,
                    "cancellation_rate_delta": round(cancellation_rate - prior_cancellation_rate, 1),
                },
                "growth_series": {
                    "labels": chart_labels,
                    "bookings": chart_bookings,
                    "revenue": chart_revenue
                },
                "cancellation_reasons": cancellation_chart,
                "category_mix": category_chart,
                "abandonment_rate": round(abandonment_rate, 1),
                "outstanding_count": bookings_in_range.filter(
                    status__in=["completed", "closed", "verified"],
                    payment_status__in=["pending", "failed"],
                    payment_collected_at__isnull=True
                ).count()
            }
        }

        cache.set(cache_key, payload, timeout=300)
        return Response(payload)


class CustomerPaymentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "view")]

    def get(self, request):
        company = getattr(request, "company", None)
        
        bookings_qs = ServiceRequest.objects.all()
        if company:
            bookings_qs = bookings_qs.filter(company=company)

        # 1. Owes: completed/closed/verified, payment pending/failed, no collection recorded, amount > 0
        owes_qs = bookings_qs.filter(
            status__in=["completed", "closed", "verified"],
            payment_status__in=["pending", "failed"],
            payment_collected_at__isnull=True,
            total_amount__gt=0
        ).select_related("customer").order_by("-created_at")

        owes_list = []
        for b in owes_qs[:100]:
            cname = b.customer_name or (b.customer.get_full_name() if b.customer else "") or (b.customer.username if b.customer else "") or "Customer"
            owes_list.append({
                "id": b.id,
                "booking_id": b.request_id,
                "customer_name": cname,
                "phone": b.phone or (b.customer.phone if b.customer else "") or "",
                "service_title": b.issue_title or b.service_category or "Service Request",
                "amount": float(b.total_amount),
                "status": b.status,
                "payment_status": b.payment_status,
                "payment_method": b.payment_method or "COD",
                "created_at": b.created_at.isoformat() if b.created_at else None
            })

        # 2. Technician holds cash: payment_status is collected, amount > 0
        technician_holds_qs = bookings_qs.filter(
            payment_status="collected",
            total_amount__gt=0
        # NOTE: ServiceRequest has no technician/assigned_employee relation
        # at all -- technician identity for cash-collection reporting is
        # tracked purely as the denormalized payment_collected_by_name
        # string field (there is no FK to join here; the earlier
        # `select_related("customer", "technician")` referenced a relation
        # that never existed on this model, which is why this endpoint
        # crashed with FieldError on every real request).
        ).select_related("customer").order_by("-created_at")

        technician_holds_list = []
        for b in technician_holds_qs[:100]:
            cname = b.customer_name or (b.customer.get_full_name() if b.customer else "") or (b.customer.username if b.customer else "") or "Customer"
            tech_name = b.payment_collected_by_name or "Assigned Technician"
            technician_holds_list.append({
                "id": b.id,
                "booking_id": b.request_id,
                "customer_name": cname,
                "phone": b.phone or (b.customer.phone if b.customer else "") or "",
                "service_title": b.issue_title or b.service_category or "Service Request",
                "amount": float(b.total_amount),
                "payment_method": b.payment_method or "COD",
                "payment_status": b.payment_status,
                "technician_name": tech_name,
                "collected_at": b.payment_collected_at.isoformat() if b.payment_collected_at else None,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            })

        # 3. Settled: paid or refunded, amount > 0
        settled_qs = bookings_qs.filter(
            payment_status__in=["paid", "refunded"],
            total_amount__gt=0
        ).select_related("customer").order_by("-created_at")

        settled_list = []
        for b in settled_qs[:100]:
            cname = b.customer_name or (b.customer.get_full_name() if b.customer else "") or (b.customer.username if b.customer else "") or "Customer"
            settled_list.append({
                "id": b.id,
                "booking_id": b.request_id,
                "customer_name": cname,
                "phone": b.phone or (b.customer.phone if b.customer else "") or "",
                "service_title": b.issue_title or b.service_category or "Service Request",
                "amount": float(b.total_amount),
                "payment_method": b.payment_method or "ONLINE",
                "payment_status": b.payment_status,
                "transaction_id": b.transaction_id or "",
                "created_at": b.created_at.isoformat() if b.created_at else None,
            })

        # Summary KPIs
        summary = {
            "total_settled_amount": float(bookings_qs.filter(payment_status__in=["paid", "refunded"]).aggregate(s=Sum("total_amount"))["s"] or 0),
            "settled_count": bookings_qs.filter(payment_status__in=["paid", "refunded"]).count(),
            "total_outstanding_amount": float(owes_qs.aggregate(s=Sum("total_amount"))["s"] or 0),
            "outstanding_count": owes_qs.count(),
            "total_technician_holds": float(technician_holds_qs.aggregate(s=Sum("total_amount"))["s"] or 0),
            "technician_holds_count": technician_holds_qs.count(),
            "total_processed_transactions": bookings_qs.filter(payment_status__in=["paid", "refunded", "collected", "pending"]).count()
        }

        return Response({
            "success": True,
            "data": {
                "summary": summary,
                "owes": owes_list,
                "technician_holds": technician_holds_list,
                "settled": settled_list
            }
        })


class CustomerExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("customers", "export")]

    def get(self, request):
        company = getattr(request, "company", None)
        format_type = request.query_params.get("export_format", "csv").lower()
        
        # Log export event in AuditLog
        AuditLog.objects.create(
            actor=request.user,
            action="CUSTOMER_EXPORT",
            details=f"Exported customer directory {format_type.upper()}. Company: {company.company_name if company else 'All'}."
        )

        if format_type == "pdf":
            # Generate PDF using ReportLab
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.colors import HexColor, white
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from io import BytesIO

            buffer = BytesIO()
            # Landscape A4 gives 842 pt width. Top/bottom margins of 30, left/right margins of 30. Printable width: 782 pt.
            doc = SimpleDocTemplate(
                buffer, 
                pagesize=landscape(A4), 
                rightMargin=30, 
                leftMargin=30, 
                topMargin=30, 
                bottomMargin=30
            )
            story = []

            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'TitleStyle',
                parent=styles['Title'],
                fontName='Helvetica-Bold',
                fontSize=18,
                textColor=HexColor("#4F46E5"),
                alignment=0,
                spaceAfter=15
            )
            
            comp_name = company.company_name if company else "All"
            title_text = f"Customer Directory Report - {comp_name}"
            story.append(Paragraph(title_text, title_style))
            story.append(Spacer(1, 10))

            headers = ["ID", "Username", "Full Name", "Email", "Phone", "Bookings", "Spent", "Last Booking"]
            data = [headers]

            customers = get_annotated_customers(request)
            for c in customers:
                identity_id = getattr(c.user, "customer_identity", None)
                if not identity_id:
                    from customer_analytics.models import CustomerIdentity
                    raw_phone = getattr(c.user, "phone", "") or ""
                    import re
                    cleaned = re.sub(r"[^\d+]", "", str(raw_phone))
                    if cleaned and not cleaned.startswith("+"):
                        if len(cleaned) == 10:
                            cleaned = f"+91{cleaned}"
                        elif cleaned.startswith("91") and len(cleaned) == 12:
                            cleaned = f"+{cleaned}"
                        else:
                            cleaned = f"+{cleaned}"
                    try:
                        identity_id, _ = CustomerIdentity.objects.get_or_create(
                            user=c.user,
                            defaults={
                                "company": c.company,
                                "phone_normalized": cleaned,
                                "email_normalized": c.user.email or ""
                            }
                        )
                    except Exception:
                        pass
                
                ident_id = str(identity_id.id if identity_id else c.display_customer_id)
                last_booking = c.last_booking_date.strftime("%Y-%m-%d %H:%M:%S") if c.last_booking_date else "-"
                
                data.append([
                    ident_id,
                    str(c.user.username),
                    str(c.name or c.user.get_full_name() or c.user.username),
                    str(c.email or c.user.email or "-"),
                    str(c.phone or c.user.phone or "-"),
                    str(c.total_bookings),
                    f"INR {float(c.total_spent or 0):.2f}",
                    last_booking
                ])

            # colWidths sum up to 780 (fits within 782 printable width)
            col_widths = [45, 95, 110, 160, 100, 60, 70, 110]
            t = Table(data, colWidths=col_widths, repeatRows=1)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), HexColor("#4F46E5")),
                ('TEXTCOLOR', (0,0), (-1,0), white),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('TOPPADDING', (0,0), (-1,0), 8),
                ('GRID', (0,0), (-1,-1), 0.5, HexColor("#E2E8F0")),
                ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
                ('FONTSIZE', (0,1), (-1,-1), 9),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor("#F8FAFC")]),
                ('TOPPADDING', (0,1), (-1,-1), 6),
                ('BOTTOMPADDING', (0,1), (-1,-1), 6),
            ]))
            story.append(t)

            doc.build(story)
            pdf_bytes = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="customers_export.pdf"'
            return response

        else:
            # Default to CSV
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="customers_export.csv"'

            writer = csv.writer(response)
            writer.writerow([
                "ID", "Username", "Full Name", "Email", "Phone", "Total Bookings", "Total Spent", "Last Booking"
            ])

            customers = get_annotated_customers(request)
            for c in customers:
                identity_id = getattr(c.user, "customer_identity", None)
                if not identity_id:
                    from customer_analytics.models import CustomerIdentity
                    raw_phone = getattr(c.user, "phone", "") or ""
                    import re
                    cleaned = re.sub(r"[^\d+]", "", str(raw_phone))
                    if cleaned and not cleaned.startswith("+"):
                        if len(cleaned) == 10:
                            cleaned = f"+91{cleaned}"
                        elif cleaned.startswith("91") and len(cleaned) == 12:
                            cleaned = f"+{cleaned}"
                        else:
                            cleaned = f"+{cleaned}"
                    try:
                        identity_id, _ = CustomerIdentity.objects.get_or_create(
                            user=c.user,
                            defaults={
                                "company": c.company,
                                "phone_normalized": cleaned,
                                "email_normalized": c.user.email or ""
                            }
                        )
                    except Exception:
                        pass

                writer.writerow([
                    identity_id.id if identity_id else c.display_customer_id,
                    c.user.username,
                    c.name or c.user.get_full_name() or c.user.username,
                    c.email or c.user.email or "",
                    c.phone or c.user.phone or "",
                    c.total_bookings,
                    f"{float(c.total_spent or 0):.2f}",
                    c.last_booking_date.strftime("%Y-%m-%d %H:%M:%S") if c.last_booking_date else ""
                ])

            return response


class CustomerMergeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        """
        List potential merge candidates dynamically (users sharing normalized phone numbers).
        """
        company = getattr(request, "company", None)
        
        # Group identities by phone
        identities = CustomerIdentity.objects.filter(merged_into__isnull=True)
        if company:
            identities = identities.filter(company=company)

        # Get phones that appear multiple times
        duplicate_phones = identities.exclude(phone_normalized="").values("phone_normalized").annotate(
            cnt=Count("id")
        ).filter(cnt__gt=1).order_by("-cnt")

        candidates = []
        for dp in duplicate_phones:
            phone = dp["phone_normalized"]
            idents = identities.filter(phone_normalized=phone)
            users_info = []
            for ident in idents:
                # Count total bookings for comparison
                booking_count = ServiceRequest.objects.filter(customer=ident.user).count()
                users_info.append({
                    "identity_id": ident.id,
                    "user_id": ident.user.id,
                    "username": ident.user.username,
                    "name": ident.user.get_full_name() or ident.user.username,
                    "email": ident.email_normalized,
                    "bookings_count": booking_count,
                    "joined_at": ident.user.date_joined.isoformat(),
                })
            
            candidates.append({
                "phone": phone,
                "matching_identities": users_info
            })

        return Response({
            "success": True,
            "data": candidates
        })

    def post(self, request):
        """
        Perform a merge of customer account source_id -> target_id.
        """
        source_id = request.data.get("source_id")
        target_id = request.data.get("target_id")
        note = request.data.get("note", "")

        if not source_id or not target_id:
            return Response({"success": False, "message": "Both source_id and target_id are required"}, status=400)

        if source_id == target_id:
            return Response({"success": False, "message": "Cannot merge account into itself"}, status=400)

        with transaction.atomic():
            try:
                source_ident = CustomerIdentity.objects.select_for_update().get(pk=source_id, merged_into__isnull=True)
                target_ident = CustomerIdentity.objects.select_for_update().get(pk=target_id, merged_into__isnull=True)
            except CustomerIdentity.DoesNotExist:
                return Response({"success": False, "message": "Source or target identity not found"}, status=404)

            # 1. Update identity relation
            source_ident.merged_into = target_ident
            source_ident.merge_note = note
            source_ident.save()

            # 2. Re-route bookings to target user!
            bookings_updated = ServiceRequest.objects.filter(customer=source_ident.user).update(
                customer=target_ident.user
            )

            # 3. Log compliance audit event
            AuditLog.objects.create(
                actor=request.user,
                action="CUSTOMER_MERGE",
                details=f"Merged user {source_ident.user.username} (ID: {source_ident.user.id}) into {target_ident.user.username} (ID: {target_ident.user.id}). Re-routed {bookings_updated} bookings. Note: {note}"
            )

        return Response({
            "success": True,
            "message": f"Successfully merged customer identity {source_id} into {target_id}. Re-routed {bookings_updated} bookings."
        })


class CustomerUnmergeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request):
        """
        Undoes a previous merge for an identity.
        """
        identity_id = request.data.get("identity_id")

        if not identity_id:
            return Response({"success": False, "message": "identity_id is required"}, status=400)

        with transaction.atomic():
            try:
                identity = CustomerIdentity.objects.select_for_update().get(pk=identity_id, merged_into__isnull=False)
            except CustomerIdentity.DoesNotExist:
                return Response({"success": False, "message": "Merged identity not found"}, status=404)

            previous_target = identity.merged_into
            identity.merged_into = None
            identity.merge_note = ""
            identity.save()

            # Note: We do NOT automatically move bookings back, because they might be mixed.
            # But wait! If we want it fully reversible, we can select bookings that originally belonged
            # to the source user before merge. However, standard policy is just restoring the separate account identities,
            # and letting them re-sync or manually re-assign.
            
            AuditLog.objects.create(
                actor=request.user,
                action="CUSTOMER_UNMERGE",
                details=f"Unmerged user {identity.user.username} (ID: {identity.user.id}) from {previous_target.user.username} (ID: {previous_target.user.id})."
            )

        return Response({
            "success": True,
            "message": f"Successfully unmerged customer identity {identity_id}."
        })
