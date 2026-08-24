from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from common.drf import CompanyScopedViewSet
from customer_care.models import CustomerCareTicket, CareAgentProfile, Escalation, MessageTemplate, CancellationRequest
from customer_care.permissions import IsCareAgent, CanAssignTickets
from customer_care.serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    CareAgentProfileSerializer,
    TicketMessageSerializer,
    TicketAttachmentSerializer,
    CommunicationLogSerializer,
    MessageTemplateSerializer,
    CancellationRequestSerializer,
)

from customer_care.services import ticket_service, refund_bridge, communication_service, analytics_service

User = get_user_model()

class StandardResponseMixin:
    def success_response(self, data=None, message="Success", status_code=status.HTTP_200_OK):
        return Response({
            "success": True,
            "data": data,
            "message": message
        }, status=status_code)

    def error_response(self, message="Error occurred", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({
            "success": False,
            "message": message,
            "errors": errors
        }, status=status_code)


class CustomerCareTicketViewSet(StandardResponseMixin, CompanyScopedViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]

    def get_serializer_class(self):
        if self.action in ["retrieve"]:
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and getattr(user, "role", "") == "customer":
            phone_val = getattr(user, "phone", "") or ""
            email_val = user.email or ""
            filters = Q(customer=user)
            if email_val:
                filters |= Q(email__iexact=email_val)
            if phone_val:
                filters |= Q(phone=phone_val)
            return CustomerCareTicket.objects.filter(filters).distinct().order_by("-created_at")

        qs = CustomerCareTicket.objects.all()

        status_param = self.request.query_params.get("status")
        priority_param = self.request.query_params.get("priority")
        category_param = self.request.query_params.get("category")
        assigned_agent = self.request.query_params.get("assigned_agent")
        search = self.request.query_params.get("search")
        sla_breached = self.request.query_params.get("sla_breached")

        if status_param:
            if status_param == "open_all":
                qs = qs.exclude(status__in=["resolved", "closed"])
            else:
                qs = qs.filter(status=status_param)
        if priority_param:
            if priority_param == "high_all":
                qs = qs.filter(priority__in=["high", "critical"])
            else:
                qs = qs.filter(priority=priority_param)
        if category_param:
            qs = qs.filter(category=category_param)
        if assigned_agent:
            if assigned_agent == "unassigned":
                qs = qs.filter(assigned_agent__isnull=True)
            else:
                qs = qs.filter(assigned_agent_id=assigned_agent)
        if search:
            qs = qs.filter(ticket_number__icontains=search) \
               | qs.filter(customer_name__icontains=search) \
               | qs.filter(email__icontains=search) \
               | qs.filter(phone__icontains=search) \
               | qs.filter(customer__customer_id__icontains=search) \
               | qs.filter(service_request__customer__customer_id__icontains=search)
        if sla_breached in ("true", "1", "yes"):
            from django.utils import timezone
            qs = qs.filter(
                sla_due_at__lt=timezone.now()
            ).exclude(status__in=["resolved", "closed"])

        return qs.order_by("-created_at")


    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            created_by = request.user
            from companies.models import Company
            company = getattr(request.user, "company", None) or Company.objects.first()

            customer_id = request.data.get("customer")
            customer = None
            if customer_id and str(customer_id).strip() != "":
                try:
                    customer = User.objects.get(pk=customer_id)
                except (User.DoesNotExist, ValueError):
                    return self.error_response(f"User with ID {customer_id} does not exist.")
            elif request.user.is_authenticated and getattr(request.user, "role", "") == "customer":
                customer = request.user

            cust_name = request.data.get("customer_name") or (customer.get_full_name() if customer else "") or (customer.username if customer else "")
            cust_phone = request.data.get("phone") or (getattr(customer, "phone", "") if customer else "")
            cust_email = request.data.get("email") or (getattr(customer, "email", "") if customer else "")

            booking_id = request.data.get("booking")
            from service_requests.models import ServiceRequest
            booking = None
            if booking_id and str(booking_id).strip() != "":
                try:
                    booking = ServiceRequest.objects.get(pk=booking_id)
                except (ServiceRequest.DoesNotExist, ValueError):
                    return self.error_response(f"Service Request with ID {booking_id} does not exist.")

            ticket = ticket_service.create_ticket(
                company=company,
                created_by=created_by,
                category=request.data.get("category", "general"),
                priority=request.data.get("priority", "medium"),
                channel=request.data.get("channel", "chat" if request.user.role == "customer" else "portal"),
                customer=customer,
                customer_name=cust_name,
                phone=cust_phone,
                email=cust_email,
                booking=booking
            )
            serializer = self.get_serializer(ticket)
            return self.success_response(serializer.data, "Ticket created successfully", status.HTTP_201_CREATED)
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        agent_id = request.data.get("agent_id")
        if not agent_id:
            return self.error_response("agent_id is required")
        try:
            agent = User.objects.get(pk=agent_id)
            updated_ticket = ticket_service.assign_ticket(ticket, request.user, agent)
            serializer = self.get_serializer(updated_ticket)
            return self.success_response(serializer.data, f"Ticket assigned to {agent.username}")
        except User.DoesNotExist:
            return self.error_response("Agent not found")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get("status")
        note = request.data.get("note", "")
        if not new_status:
            return self.error_response("status is required")
        try:
            updated_ticket = ticket_service.change_ticket_status(ticket, request.user, new_status, note)
            serializer = self.get_serializer(updated_ticket)
            return self.success_response(serializer.data, f"Status updated to {new_status}")
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def escalate(self, request, pk=None):
        ticket = self.get_object()
        escalated_to_tier = request.data.get("escalated_to_tier")
        reason = request.data.get("reason")
        if not escalated_to_tier or not reason:
            return self.error_response("escalated_to_tier and reason are required")
        try:
            esc = ticket_service.escalate_ticket(ticket, request.user, escalated_to_tier, reason)
            return self.success_response(None, f"Ticket escalated to {escalated_to_tier}")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        message_text = request.data.get("message")
        is_internal_note = request.data.get("is_internal_note", False)
        if not message_text:
            return self.error_response("message is required")
        try:
            msg = ticket_service.add_message(ticket, request.user, message_text, is_internal_note)
            serializer = TicketMessageSerializer(msg)
            return self.success_response(serializer.data, "Message added successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def upload_attachment(self, request, pk=None):
        ticket = self.get_object()
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return self.error_response("file is required")
        try:
            from customer_care.models import TicketAttachment, TicketActivity
            attachment = TicketAttachment.objects.create(
                ticket=ticket,
                file=uploaded_file,
                uploaded_by=request.user
            )
            TicketActivity.objects.create(
                ticket=ticket,
                actor=request.user,
                activity_type="ATTACHMENT_ADDED",
                description=f"Attachment added: {uploaded_file.name}"
            )
            serializer = TicketAttachmentSerializer(attachment)
            return self.success_response(serializer.data, "Attachment uploaded successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def request_refund(self, request, pk=None):
        ticket = self.get_object()
        refund_type = request.data.get("refund_type")
        requested_amount = request.data.get("requested_amount")
        reason = request.data.get("reason")
        additional_notes = request.data.get("additional_notes", "")
        
        if not refund_type or not requested_amount or not reason:
            return self.error_response("refund_type, requested_amount, and reason are required")
        try:
            refund_bridge.request_refund_via_ticket(
                ticket=ticket,
                actor=request.user,
                refund_type=refund_type,
                requested_amount=requested_amount,
                reason=reason,
                additional_notes=additional_notes
            )
            return self.success_response(None, "Refund requested successfully")
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def approve_refund(self, request, pk=None):
        ticket = self.get_object()
        is_full = request.data.get("is_full", True)
        approved_amount = request.data.get("approved_amount")
        internal_note = request.data.get("internal_note", "")
        try:
            refund_bridge.approve_refund_via_ticket(
                ticket=ticket,
                actor=request.user,
                is_full=is_full,
                approved_amount=approved_amount,
                internal_note=internal_note
            )
            return self.success_response(None, "Refund approved successfully")
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def reject_refund(self, request, pk=None):
        ticket = self.get_object()
        internal_note = request.data.get("internal_note", "")
        try:
            refund_bridge.reject_refund_via_ticket(
                ticket=ticket,
                actor=request.user,
                internal_note=internal_note
            )
            return self.success_response(None, "Refund rejected successfully")
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def send_refund_to_finance(self, request, pk=None):
        ticket = self.get_object()
        try:
            refund_bridge.send_refund_to_finance_via_ticket(ticket, request.user)
            return self.success_response(None, "Refund sent to finance")
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def complete_refund(self, request, pk=None):
        ticket = self.get_object()
        try:
            refund_bridge.complete_refund_via_ticket(ticket, request.user)
            return self.success_response(None, "Refund completed successfully")
        except ValidationError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def log_communication(self, request, pk=None):
        ticket = self.get_object()
        channel = request.data.get("channel")
        direction = request.data.get("direction")
        summary = request.data.get("summary")
        duration_seconds = request.data.get("duration_seconds")
        
        if not channel or not direction or not summary:
            return self.error_response("channel, direction, and summary are required")
        try:
            log = communication_service.log_communication(
                ticket=ticket,
                logged_by=request.user,
                channel=channel,
                direction=direction,
                summary=summary,
                duration_seconds=duration_seconds
            )
            serializer = CommunicationLogSerializer(log)
            return self.success_response(serializer.data, "Communication logged successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["get"])
    def context(self, request, pk=None):
        ticket = self.get_object()
        booking = ticket.booking
        customer = ticket.customer or (booking.customer if booking else None)
        
        customer_data = None
        if customer:
            customer_data = {
                "id": customer.id,
                "name": customer.get_full_name() or customer.username,
                "email": customer.email,
                "phone": getattr(customer, "phone", "") or ticket.phone,
            }
        elif ticket.customer_name or ticket.phone:
            customer_data = {
                "id": None,
                "name": ticket.customer_name,
                "email": ticket.email,
                "phone": ticket.phone,
            }

        booking_data = None
        if booking:
            tech = booking.assigned_employee
            tech_data = None
            if tech:
                tech_data = {
                    "id": tech.id,
                    "name": tech.user.get_full_name() or tech.user.username,
                    "phone": getattr(tech.user, "phone", ""),
                }

            booking_data = {
                "id": booking.id,
                "request_id": booking.request_id,
                "service_category": booking.service_category,
                "issue_title": booking.issue_title,
                "description": booking.description,
                "address": booking.address,
                "preferred_date": booking.preferred_date,
                "preferred_time": booking.preferred_time,
                "total_amount": str(booking.total_amount),
                "final_amount": str(booking.final_amount),
                "status": booking.status,
                "payment_status": booking.payment_status,
                "technician": tech_data,
                "cart_data": booking.cart_data,
            }

        timeline = []
        if booking:
            timeline.append({"status": "created", "label": "Booking Created", "timestamp": booking.created_at})
            if booking.assigned_employee:
                timeline.append({"status": "assigned", "label": "Technician Assigned", "timestamp": booking.updated_at})
            if booking.status in ["completed", "closed"]:
                timeline.append({"status": "completed", "label": "Service Completed", "timestamp": booking.updated_at})
            elif booking.status == "cancelled":
                timeline.append({"status": "cancelled", "label": "Booking Cancelled", "timestamp": booking.updated_at})

        context_payload = {
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "customer": customer_data,
            "booking": booking_data,
            "timeline": timeline,
        }
        return self.success_response(context_payload)

    @action(detail=True, methods=["post"])
    def request_reschedule(self, request, pk=None):
        ticket = self.get_object()
        new_date = request.data.get("new_date")
        new_time_slot = request.data.get("new_time_slot")
        reason = request.data.get("reason", "Customer Request")
        notes = request.data.get("notes", "")

        if not new_date or not new_time_slot:
            return self.error_response("new_date and new_time_slot are required.")

        try:
            from customer_care.services import reschedule_bridge
            rr = reschedule_bridge.create_reschedule_via_ticket(
                ticket=ticket,
                actor=request.user,
                new_date=new_date,
                new_time_slot=new_time_slot,
                reason=reason,
                notes=notes
            )
            from service_requests.serializers import RescheduleRequestSerializer
            return self.success_response(RescheduleRequestSerializer(rr).data, "Reschedule request created successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def confirm_reschedule(self, request, pk=None):
        ticket = self.get_object()
        reschedule_id = request.data.get("reschedule_id")
        approved = request.data.get("approved", True)
        notes = request.data.get("notes", "")

        if not reschedule_id:
            return self.error_response("reschedule_id is required.")

        try:
            from customer_care.services import reschedule_bridge
            rr = reschedule_bridge.confirm_reschedule_via_ticket(
                ticket=ticket,
                actor=request.user,
                reschedule_id=reschedule_id,
                approved=approved,
                notes=notes
            )
            from service_requests.serializers import RescheduleRequestSerializer
            return self.success_response(RescheduleRequestSerializer(rr).data, f"Reschedule request {'approved' if approved else 'rejected'} successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"])
    def request_cancellation(self, request, pk=None):
        ticket = self.get_object()
        reason = request.data.get("reason")
        reason_note = request.data.get("reason_note", "")
        retention_offered = request.data.get("retention_offered", False)
        retention_outcome = request.data.get("retention_outcome", "")

        if not reason:
            return self.error_response("reason is required.")

        try:
            from customer_care.services import cancellation_bridge
            cancel_req = cancellation_bridge.request_cancellation_via_ticket(
                ticket=ticket,
                actor=request.user,
                reason=reason,
                reason_note=reason_note,
                retention_offered=retention_offered,
                retention_outcome=retention_outcome
            )
            from customer_care.serializers import CancellationRequestSerializer
            return self.success_response(CancellationRequestSerializer(cancel_req).data, "Cancellation request created successfully")
        except Exception as e:
            return self.error_response(str(e))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanAssignTickets])
    def approve_cancellation(self, request, pk=None):
        ticket = self.get_object()
        is_approved = request.data.get("is_approved", True)

        try:
            from customer_care.services import cancellation_bridge
            cancel_req = cancellation_bridge.approve_cancellation_via_ticket(
                ticket=ticket,
                actor=request.user,
                is_approved=is_approved
            )
            from customer_care.serializers import CancellationRequestSerializer
            return self.success_response(CancellationRequestSerializer(cancel_req).data, f"Cancellation request {'approved' if is_approved else 'rejected'} successfully")
        except Exception as e:
            return self.error_response(str(e))


class CareAgentProfileViewSet(StandardResponseMixin, CompanyScopedViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CareAgentProfileSerializer

    def get_queryset(self):
        # Enforce that only admins/managers can manage profiles
        user = self.request.user
        if not (user.role in ["admin", "manager"] or user.is_superuser or user.is_staff):
            raise PermissionDenied("Only administrators can manage care profiles.")
        return super().get_queryset()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class CareAnalyticsView(StandardResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]

    def get(self, request):
        from companies.models import Company
        company = getattr(request.user, "company", None) or Company.objects.first()
        try:
            analytics = analytics_service.get_care_analytics(company)
            return self.success_response(analytics)
        except Exception as e:
            return self.error_response(str(e))


class CustomerSearchView(StandardResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return self.success_response([])

        qs = User.objects.filter(role="customer")
        qs = qs.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(phone__icontains=query)
        )[:30]

        results = []
        for u in qs:
            results.append({
                "id": u.id,
                "name": u.get_full_name() or u.username,
                "email": u.email,
                "phone": getattr(u, "phone", ""),
            })

        return self.success_response(results)


class Customer360View(StandardResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]

    def get(self, request, pk=None):
        try:
            customer = User.objects.get(pk=pk, role="customer")
        except User.DoesNotExist:
            return self.error_response("Customer not found", status_code=404)

        from service_requests.models import ServiceRequest, Complaint, RefundRequest
        profile = {
            "id": customer.id,
            "name": customer.get_full_name() or customer.username,
            "email": customer.email,
            "phone": getattr(customer, "phone", ""),
            "created_at": customer.date_joined,
        }

        bookings_qs = ServiceRequest.objects.filter(customer=customer).order_by("-created_at")
        total_bookings = bookings_qs.count()
        recent_bookings = []
        for b in bookings_qs[:5]:
            recent_bookings.append({
                "id": b.id,
                "request_id": b.request_id,
                "service_category": b.service_category,
                "preferred_date": b.preferred_date,
                "total_amount": str(b.total_amount),
                "status": b.status,
            })

        tickets_qs = CustomerCareTicket.objects.filter(customer=customer).order_by("-created_at")
        open_tickets = tickets_qs.exclude(status__in=["resolved", "closed"]).count()
        recent_tickets = []
        for t in tickets_qs[:5]:
            recent_tickets.append({
                "id": t.id,
                "ticket_number": t.ticket_number,
                "category": t.category,
                "priority": t.priority,
                "status": t.status,
                "created_at": t.created_at,
            })

        refunds_qs = RefundRequest.objects.filter(customer=customer, status="completed")
        total_refunds_paid = sum(r.requested_amount for r in refunds_qs)

        complaints_qs = Complaint.objects.filter(customer=customer)
        total_complaints = complaints_qs.count()

        comm_logs_count = CommunicationLog.objects.filter(ticket__customer=customer).count()

        is_frequent_complainant = total_complaints > 3

        payload = {
            "profile": profile,
            "metrics": {
                "total_bookings": total_bookings,
                "open_tickets": open_tickets,
                "total_refunds_paid": str(total_refunds_paid),
                "total_complaints": total_complaints,
                "communication_logs_count": comm_logs_count,
                "is_frequent_complainant": is_frequent_complainant,
            },
            "recent_bookings": recent_bookings,
            "recent_tickets": recent_tickets,
        }
        return self.success_response(payload)


class CustomerCommunicationHistoryView(StandardResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]

    def get(self, request, pk=None):
        logs = CommunicationLog.objects.filter(ticket__customer_id=pk).order_by("-occurred_at")
        serializer = CommunicationLogSerializer(logs, many=True)
        return self.success_response(serializer.data)


class MessageTemplateViewSet(StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCareAgent]
    serializer_class = MessageTemplateSerializer

    def get_queryset(self):
        return MessageTemplate.objects.filter(is_active=True).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return self.success_response(serializer.data, "Template created successfully", status.HTTP_201_CREATED)


class CustomerSupportTicketView(StandardResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset_for_user(self, user):
        q_filter = Q(customer=user)
        if user.email:
            q_filter |= Q(email=user.email)
        if getattr(user, "phone", ""):
            q_filter |= Q(phone=user.phone)
        return CustomerCareTicket.objects.filter(q_filter).exclude(status="closed").order_by("-created_at")

    def get(self, request):
        """
        Get the customer's active support ticket (non-closed) and chat message thread.
        """
        ticket = self.get_queryset_for_user(request.user).first()

        if not ticket:
            return self.success_response(None, "No active support ticket found.")

        # Auto-link the customer user object if it was missing
        if not ticket.customer:
            ticket.customer = request.user
            ticket.save(update_fields=["customer", "updated_at"])

        serializer = TicketDetailSerializer(ticket, context={"request": request, "for_customer": True})
        return self.success_response(serializer.data)

    def post(self, request):
        """
        Send a message on the customer's active ticket, or create a new ticket if none exists.
        """
        ticket = self.get_queryset_for_user(request.user).first()

        message_text = request.data.get("message")
        
        if not ticket:
            # Check if there is an active booking we can automatically link
            from service_requests.models import ServiceRequest
            latest_booking = ServiceRequest.objects.filter(
                customer=request.user
            ).exclude(status="draft").order_by("-created_at").first()

            company = request.user.company
            if not company:
                from companies.models import Company
                company = Company.objects.first()

            ticket = ticket_service.create_ticket(
                company=company,
                created_by=request.user,
                category="general",
                priority="medium",
                channel="portal",
                customer=request.user,
                customer_name=request.user.get_full_name() or request.user.username,
                phone=getattr(request.user, "phone", ""),
                email=request.user.email,
                booking=latest_booking
            )
            
            if not message_text:
                message_text = "Hello support, I need assistance."
        else:
            # Auto-link the customer user object if it was missing
            if not ticket.customer:
                ticket.customer = request.user
                ticket.save(update_fields=["customer", "updated_at"])

        if not message_text:
            return self.error_response("message is required.")

        msg = ticket_service.add_message(
            ticket=ticket,
            sender=request.user,
            message=message_text,
            is_internal_note=False
        )


        if ticket.status in ["resolved", "closed"]:
            ticket_service.change_ticket_status(ticket, request.user, "reopened", note="Customer sent message on ticket.")


        serializer = TicketDetailSerializer(ticket, context={"request": request, "for_customer": True})
        return self.success_response(serializer.data, "Message sent successfully")

