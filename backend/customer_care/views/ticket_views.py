from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied

from common.drf import CompanyScopedViewSet
from customer_care.models import CustomerCareTicket, CareAgentProfile, Escalation
from customer_care.permissions import IsCareAgent, CanAssignTickets
from customer_care.serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    CareAgentProfileSerializer,
    TicketMessageSerializer,
    TicketAttachmentSerializer,
    CommunicationLogSerializer,
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
        # Customer Care is an internal admin tool — return ALL tickets without
        # company-scope filtering so no tickets are ever hidden due to a
        # missing/mismatched company field on old records.
        qs = CustomerCareTicket.objects.all()

        status_param = self.request.query_params.get("status")
        priority_param = self.request.query_params.get("priority")
        category_param = self.request.query_params.get("category")
        assigned_agent = self.request.query_params.get("assigned_agent")
        search = self.request.query_params.get("search")

        if status_param:
            qs = qs.filter(status=status_param)
        if priority_param:
            qs = qs.filter(priority=priority_param)
        if category_param:
            qs = qs.filter(category=category_param)
        if assigned_agent:
            qs = qs.filter(assigned_agent_id=assigned_agent)
        if search:
            qs = qs.filter(ticket_number__icontains=search) \
               | qs.filter(customer_name__icontains=search) \
               | qs.filter(email__icontains=search) \
               | qs.filter(phone__icontains=search)

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
            company = request.company
            created_by = request.user
            # Always resolve a company so no ticket is ever orphaned with company=None
            company = getattr(request, "company", None)
            if not company:
                from companies.models import Company
                company = Company.objects.first()

            customer_id = request.data.get("customer")
            customer = None
            if customer_id and str(customer_id).strip() != "":
                try:
                    customer = User.objects.get(pk=customer_id)
                except (User.DoesNotExist, ValueError):
                    return self.error_response(f"User with ID {customer_id} does not exist.")

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
                channel=request.data.get("channel", "portal"),
                customer=customer,
                customer_name=request.data.get("customer_name", ""),
                phone=request.data.get("phone", ""),
                email=request.data.get("email", ""),
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
        company = request.company
        if not company:
            return self.error_response("No company context found.")
        try:
            analytics = analytics_service.get_care_analytics(company)
            return self.success_response(analytics)
        except Exception as e:
            return self.error_response(str(e))
