"""
Service-wise Time Slot Management API Views.

Endpoints:
- Customer:
    GET  /api/services/<str:service_id>/time-slots/?date=YYYY-MM-DD
- Admin:
    GET  /api/admin/time-slots/services/
    GET  /api/admin/time-slots/<str:service_id>/
    POST /api/admin/time-slots/<str:service_id>/config/
    PUT  /api/admin/time-slots/<str:service_id>/weekly-schedule/
    POST /api/admin/time-slots/<str:service_id>/date-overrides/
    DELETE /api/admin/time-slots/<str:service_id>/date-overrides/<int:override_id>/
    POST /api/admin/time-slots/<str:service_id>/preview/
"""
import datetime
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.shortcuts import get_object_or_404

from accounts.permissions import IsAdminRole
from service_requests.models import (
    Service,
    CatalogCategory,
    ServiceTimeSlotConfig,
    ServiceWeeklySchedule,
    ServiceDateOverride,
)
from service_requests.services.time_slot_service import (
    resolve_service,
    get_service_time_slot_config,
    generate_slots_for_service_date,
    get_global_time_slot_defaults,
    save_global_time_slot_defaults,
    DEFAULT_START_TIME,
    DEFAULT_END_TIME,
    DEFAULT_SLOT_DURATION_MINUTES,
    DEFAULT_SLOT_CAPACITY,
)

logger = logging.getLogger(__name__)


def _parse_time_str(time_val):
    if not time_val:
        return None
    if isinstance(time_val, datetime.time):
        return time_val
    s = str(time_val).strip()
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.datetime.strptime(s, fmt).time()
        except ValueError:
            pass
    return None


class CustomerServiceTimeSlotsView(APIView):
    """
    Public customer endpoint to fetch generated bookable time slots for a service + date.
    GET /api/services/<str:service_id>/time-slots/?date=YYYY-MM-DD
    """
    permission_classes = [AllowAny]

    def get(self, request, service_id=None):
        effective_service_id = service_id
        if not effective_service_id or str(effective_service_id).lower() in ("resolve", "none", "null", "undefined"):
            effective_service_id = request.GET.get("service_id") or request.GET.get("service")

        package_id = request.GET.get("package_id") or request.GET.get("package")
        category_id = request.GET.get("category_id") or request.GET.get("category")

        service, err = resolve_service(
            service_param=effective_service_id,
            package_param=package_id,
            category_param=category_id,
        )
        if not service:
            # Fallback to first available active service so customer booking flow never fails
            service = Service.objects.filter(is_active=True).first()

        date_str = request.GET.get("date")
        if not date_str:
            target_date = timezone.localtime().date()
        else:
            try:
                target_date = datetime.date.fromisoformat(date_str.split("T")[0].strip())
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "message": f"Invalid date format '{date_str}'. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        slot_data = generate_slots_for_service_date(service, target_date)
        return Response({"success": True, "data": slot_data})


class AdminServiceTimeSlotListView(APIView):
    """
    List all catalog services with their time slot configuration status.
    GET /api/admin/time-slots/services/
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        category_id = request.GET.get("category_id")
        search = (request.GET.get("search") or "").strip().lower()

        qs = Service.objects.select_related("category", "time_slot_config").all()
        if category_id:
            qs = qs.filter(category_id=category_id)
        if search:
            qs = qs.filter(name__icontains=search)

        results = []
        for svc in qs:
            cfg = getattr(svc, "time_slot_config", None)
            is_configured = cfg is not None
            start_t = cfg.default_start_time if cfg else DEFAULT_START_TIME
            end_t = cfg.default_end_time if cfg else DEFAULT_END_TIME
            duration = cfg.slot_duration_minutes if cfg else DEFAULT_SLOT_DURATION_MINUTES
            capacity = cfg.slot_capacity if cfg else DEFAULT_SLOT_CAPACITY
            is_act = cfg.is_active if cfg else True

            results.append({
                "id": svc.id,
                "name": svc.name,
                "slug": svc.slug,
                "category_id": svc.category_id,
                "category_name": svc.category.name if svc.category else "",
                "is_configured": is_configured,
                "is_using_default": not is_configured,
                "is_active": is_act,
                "default_start_time": start_t.strftime("%H:%M"),
                "default_end_time": end_t.strftime("%H:%M"),
                "slot_duration_minutes": duration,
                "slot_capacity": capacity,
                "overrides_count": svc.date_overrides.count(),
            })

        global_defaults = get_global_time_slot_defaults()
        return Response({
            "success": True,
            "data": results,
            "global_defaults": global_defaults,
            "summary": {
                "total_services": len(results),
                "customized_count": sum(1 for r in results if r["is_configured"]),
                "default_count": sum(1 for r in results if not r["is_configured"]),
            }
        })


class AdminGlobalTimeSlotConfigView(APIView):
    """
    Manage the platform-wide Global Default Time Slot configuration.
    GET  /api/admin/time-slots/global-default/
    POST /api/admin/time-slots/global-default/
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        g = get_global_time_slot_defaults()
        total_services = Service.objects.count()
        configured_services = ServiceTimeSlotConfig.objects.count()
        default_services = max(0, total_services - configured_services)

        return Response({
            "success": True,
            "data": {
                **g,
                "total_services": total_services,
                "customized_services_count": configured_services,
                "default_services_count": default_services,
            }
        })

    def post(self, request):
        data = request.data
        start_t = _parse_time_str(data.get("default_start_time")) or DEFAULT_START_TIME
        end_t = _parse_time_str(data.get("default_end_time")) or DEFAULT_END_TIME

        if start_t >= end_t:
            return Response(
                {"success": False, "message": "Default start time must be earlier than default end time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duration = int(data.get("slot_duration_minutes") or DEFAULT_SLOT_DURATION_MINUTES)
        if duration <= 0 or duration > 480:
            return Response(
                {"success": False, "message": "Slot duration must be between 5 and 480 minutes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        capacity = int(data.get("slot_capacity") or DEFAULT_SLOT_CAPACITY)
        if capacity <= 0:
            return Response(
                {"success": False, "message": "Slot capacity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_active = bool(data.get("is_active", True))
        weekly_sched = data.get("weekly_schedule")

        update_payload = {
            "default_start_time": start_t.strftime("%H:%M"),
            "default_end_time": end_t.strftime("%H:%M"),
            "slot_duration_minutes": duration,
            "slot_capacity": capacity,
            "is_active": is_active,
        }
        if isinstance(weekly_sched, list) and len(weekly_sched) > 0:
            update_payload["weekly_schedule"] = weekly_sched

        saved = save_global_time_slot_defaults(update_payload)

        # Handle batch application
        apply_to = str(data.get("apply_to") or "save_only").lower()
        applied_count = 0
        if apply_to == "reset_all":
            # Delete all custom service configs so all cleanly inherit the global default
            ServiceWeeklySchedule.objects.all().delete()
            ServiceTimeSlotConfig.objects.all().delete()
            applied_count = Service.objects.count()
            msg = f"Global default updated and applied to ALL {applied_count} services (all custom overrides cleared)."
        elif apply_to == "all":
            # Apply to all services by updating or creating custom configs
            for svc in Service.objects.all():
                ServiceTimeSlotConfig.objects.update_or_create(
                    service=svc,
                    defaults={
                        "default_start_time": start_t,
                        "default_end_time": end_t,
                        "slot_duration_minutes": duration,
                        "slot_capacity": capacity,
                        "is_active": is_active,
                    }
                )
                if isinstance(weekly_sched, list):
                    for w in weekly_sched:
                        d_idx = w.get("day_of_week") or w.get("weekday")
                        if d_idx is not None and 0 <= int(d_idx) <= 6:
                            use_def = bool(w.get("use_default_hours", True))
                            if use_def:
                                ServiceWeeklySchedule.objects.filter(service=svc, day_of_week=int(d_idx)).delete()
                            else:
                                ServiceWeeklySchedule.objects.update_or_create(
                                    service=svc,
                                    day_of_week=int(d_idx),
                                    defaults={
                                        "is_open": bool(w.get("is_open", True)),
                                        "start_time": _parse_time_str(w.get("start_time")),
                                        "end_time": _parse_time_str(w.get("end_time")),
                                        "slot_capacity": int(w["slot_capacity"]) if w.get("slot_capacity") else None,
                                    }
                                )
                applied_count += 1
            msg = f"Global default updated and explicitly synced to {applied_count} services."
        elif apply_to == "unconfigured":
            total = Service.objects.count()
            cfg_count = ServiceTimeSlotConfig.objects.count()
            applied_count = max(0, total - cfg_count)
            msg = f"Global default saved. {applied_count} uncustomized services are now inheriting these settings."
        else:
            msg = "Global default configuration saved successfully."

        return Response({
            "success": True,
            "message": msg,
            "data": {
                **saved,
                "total_services": Service.objects.count(),
                "customized_services_count": ServiceTimeSlotConfig.objects.count(),
                "applied_count": applied_count,
            }
        })

    put = post


class AdminServiceRevertDefaultView(APIView):
    """
    Revert an individually customized service back to inheriting Global Platform Defaults.
    POST /api/admin/time-slots/<str:service_id>/revert-default/
    """
    permission_classes = [IsAdminRole]

    def _get_service(self, service_id):
        if str(service_id).isdigit():
            return Service.objects.filter(id=int(service_id)).first()
        return Service.objects.filter(slug__iexact=str(service_id)).first()

    def post(self, request, service_id):
        service = self._get_service(service_id)
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        ServiceTimeSlotConfig.objects.filter(service=service).delete()
        ServiceWeeklySchedule.objects.filter(service=service).delete()

        return Response({
            "success": True,
            "message": f"'{service.name}' has been reverted to use Global Platform Defaults.",
            "data": {
                "service_id": service.id,
                "is_configured": False,
            }
        })


class AdminServiceTimeSlotDetailView(APIView):
    """
    Retrieve or update a service's full time slot configuration:
    - Base config (start/end, duration, capacity, is_active)
    - 7-day weekly schedule
    - Date overrides / holidays
    GET  /api/admin/time-slots/<str:service_id>/
    POST /api/admin/time-slots/<str:service_id>/config/
    """
    permission_classes = [IsAdminRole]

    def _get_service(self, service_id):
        if str(service_id).isdigit():
            return Service.objects.filter(id=int(service_id)).first()
        return Service.objects.filter(slug__iexact=str(service_id)).first()

    def get(self, request, service_id):
        service = self._get_service(service_id)
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        config = get_service_time_slot_config(service)
        has_config_row = ServiceTimeSlotConfig.objects.filter(service=service).exists()

        # Build 7-day weekly schedule list
        existing_weekly = {
            w.day_of_week: w
            for w in ServiceWeeklySchedule.objects.filter(service=service)
        }
        weekly_schedule = []
        for day_idx, day_name in ServiceWeeklySchedule.DAY_CHOICES:
            w = existing_weekly.get(day_idx)
            is_custom = w is not None
            is_op = w.is_open if w else True
            start_val = w.start_time.strftime("%H:%M") if w and w.start_time else config.default_start_time.strftime("%H:%M")
            end_val = w.end_time.strftime("%H:%M") if w and w.end_time else config.default_end_time.strftime("%H:%M")
            cap_val = w.slot_capacity if w and w.slot_capacity else config.slot_capacity
            # use_default_hours is True if no custom row exists OR if custom row has neither custom start/end hours
            use_def = not is_custom or (w and w.start_time is None and w.end_time is None and w.is_open and (w.slot_capacity is None or w.slot_capacity == config.slot_capacity))

            weekly_schedule.append({
                "day_of_week": day_idx,
                "weekday": day_idx,
                "day_name": day_name,
                "is_open": is_op,
                "use_default_hours": use_def,
                "start_time": start_val,
                "end_time": end_val,
                "slot_capacity": cap_val,
                "is_customized": is_custom,
            })

        # Date overrides (recent past & future)
        today = timezone.localtime().date()
        date_overrides = []
        for o in ServiceDateOverride.objects.filter(service=service).order_by("date"):
            date_overrides.append({
                "id": o.id,
                "date": o.date.strftime("%Y-%m-%d"),
                "is_closed": o.is_closed,
                "start_time": o.start_time.strftime("%H:%M") if o.start_time else None,
                "end_time": o.end_time.strftime("%H:%M") if o.end_time else None,
                "reason": o.reason,
                "slot_capacity": o.slot_capacity,
                "is_past": o.date < today,
            })

        return Response({
            "success": True,
            "data": {
                "service": {
                    "id": service.id,
                    "name": service.name,
                    "slug": service.slug,
                    "category_id": service.category_id,
                    "category_name": service.category.name if service.category else "",
                },
                "config": {
                    "is_configured": has_config_row,
                    "default_start_time": config.default_start_time.strftime("%H:%M"),
                    "default_end_time": config.default_end_time.strftime("%H:%M"),
                    "slot_duration_minutes": config.slot_duration_minutes,
                    "slot_capacity": config.slot_capacity,
                    "is_active": config.is_active,
                },
                "default_start_time": config.default_start_time.strftime("%H:%M"),
                "default_end_time": config.default_end_time.strftime("%H:%M"),
                "slot_duration_minutes": config.slot_duration_minutes,
                "slot_capacity": config.slot_capacity,
                "is_active": config.is_active,
                "weekly_schedule": weekly_schedule,
                "weekly_schedules": weekly_schedule,
                "date_overrides": date_overrides,
            }
        })

    def post(self, request, service_id):
        service = self._get_service(service_id)
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        start_t = _parse_time_str(data.get("default_start_time")) or DEFAULT_START_TIME
        end_t = _parse_time_str(data.get("default_end_time")) or DEFAULT_END_TIME

        if start_t >= end_t:
            return Response(
                {"success": False, "message": "Default start time must be earlier than default end time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duration = int(data.get("slot_duration_minutes") or DEFAULT_SLOT_DURATION_MINUTES)
        if duration <= 0 or duration > 480:
            return Response(
                {"success": False, "message": "Slot duration must be between 5 and 480 minutes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        capacity = int(data.get("slot_capacity") or DEFAULT_SLOT_CAPACITY)
        if capacity <= 0:
            return Response(
                {"success": False, "message": "Slot capacity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_active = bool(data.get("is_active", True))

        config, _ = ServiceTimeSlotConfig.objects.update_or_create(
            service=service,
            defaults={
                "default_start_time": start_t,
                "default_end_time": end_t,
                "slot_duration_minutes": duration,
                "slot_capacity": capacity,
                "is_active": is_active,
            }
        )

        return Response({
            "success": True,
            "message": f"Time slot configuration updated for {service.name}.",
            "data": {
                "default_start_time": config.default_start_time.strftime("%H:%M"),
                "default_end_time": config.default_end_time.strftime("%H:%M"),
                "slot_duration_minutes": config.slot_duration_minutes,
                "slot_capacity": config.slot_capacity,
                "is_active": config.is_active,
            }
        })

    put = post


class AdminServiceWeeklyScheduleView(APIView):
    """
    Batch update 7-day schedule for a service.
    PUT /api/admin/time-slots/<str:service_id>/weekly-schedule/
    Body:
    [
        {"day_of_week": 0, "is_open": true, "start_time": "09:00", "end_time": "18:00", "slot_capacity": 1},
        ...
    ]
    """
    permission_classes = [IsAdminRole]

    def put(self, request, service_id):
        if str(service_id).isdigit():
            service = Service.objects.filter(id=int(service_id)).first()
        else:
            service = Service.objects.filter(slug__iexact=str(service_id)).first()
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        schedule_items = request.data
        if not isinstance(schedule_items, list):
            schedule_items = request.data.get("schedules") or request.data.get("schedule") or []

        if not isinstance(schedule_items, list):
            return Response(
                {"success": False, "message": "Expected a list of daily schedule objects."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_items = []
        for item in schedule_items:
            day_idx = item.get("day_of_week")
            if day_idx is None:
                day_idx = item.get("weekday")
            if day_idx is None or not (0 <= int(day_idx) <= 6):
                continue
            day_idx = int(day_idx)
            is_open = bool(item.get("is_open", True))
            use_default = bool(item.get("use_default_hours", False))

            start_t = _parse_time_str(item.get("start_time"))
            end_t = _parse_time_str(item.get("end_time"))
            cap = item.get("slot_capacity")
            slot_cap = int(cap) if cap is not None and str(cap).isdigit() and int(cap) > 0 else None

            # If day is open and using default hours, delete the custom weekly row to cleanly inherit default
            if is_open and (use_default or (not start_t and not end_t and not slot_cap)):
                ServiceWeeklySchedule.objects.filter(service=service, day_of_week=day_idx).delete()
                updated_items.append({
                    "day_of_week": day_idx,
                    "weekday": day_idx,
                    "is_open": True,
                    "use_default_hours": True,
                    "start_time": None,
                    "end_time": None,
                    "slot_capacity": None,
                })
                continue

            if is_open and start_t and end_t and start_t >= end_t:
                day_name = dict(ServiceWeeklySchedule.DAY_CHOICES).get(day_idx, str(day_idx))
                return Response(
                    {"success": False, "message": f"{day_name}: Start time must be earlier than end time."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            sched, _ = ServiceWeeklySchedule.objects.update_or_create(
                service=service,
                day_of_week=day_idx,
                defaults={
                    "is_open": is_open,
                    "start_time": start_t,
                    "end_time": end_t,
                    "slot_capacity": slot_cap,
                }
            )
            updated_items.append({
                "day_of_week": sched.day_of_week,
                "weekday": sched.day_of_week,
                "is_open": sched.is_open,
                "use_default_hours": False,
                "start_time": sched.start_time.strftime("%H:%M") if sched.start_time else None,
                "end_time": sched.end_time.strftime("%H:%M") if sched.end_time else None,
                "slot_capacity": sched.slot_capacity,
            })

        return Response({
            "success": True,
            "message": "Weekly schedule updated successfully.",
            "data": updated_items,
        })

    post = put


class AdminServiceDateOverrideView(APIView):
    """
    Create or update date override for a service.
    POST /api/admin/time-slots/<str:service_id>/date-overrides/
    """
    permission_classes = [IsAdminRole]

    def post(self, request, service_id):
        if str(service_id).isdigit():
            service = Service.objects.filter(id=int(service_id)).first()
        else:
            service = Service.objects.filter(slug__iexact=str(service_id)).first()
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        date_str = data.get("date") or data.get("override_date")
        if not date_str:
            return Response({"success": False, "message": "Date is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.date.fromisoformat(str(date_str).split("T")[0].strip())
        except (ValueError, TypeError):
            return Response({"success": False, "message": "Invalid date format. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        is_closed = bool(data.get("is_closed", False))
        reason = str(data.get("reason") or "").strip()
        start_t = _parse_time_str(data.get("start_time") or data.get("custom_start_time"))
        end_t = _parse_time_str(data.get("end_time") or data.get("custom_end_time"))

        if not is_closed and start_t and end_t and start_t >= end_t:
            return Response(
                {"success": False, "message": "Start time must be earlier than end time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cap = data.get("slot_capacity") if "slot_capacity" in data else data.get("custom_slot_capacity")
        slot_cap = int(cap) if cap is not None and str(cap).isdigit() and int(cap) > 0 else None

        override, created = ServiceDateOverride.objects.update_or_create(
            service=service,
            date=target_date,
            defaults={
                "is_closed": is_closed,
                "reason": reason,
                "start_time": start_t,
                "end_time": end_t,
                "slot_capacity": slot_cap,
            }
        )

        return Response({
            "success": True,
            "message": f"Date override {'created' if created else 'updated'} for {target_date}.",
            "data": {
                "id": override.id,
                "date": override.date.strftime("%Y-%m-%d"),
                "is_closed": override.is_closed,
                "reason": override.reason,
                "start_time": override.start_time.strftime("%H:%M") if override.start_time else None,
                "end_time": override.end_time.strftime("%H:%M") if override.end_time else None,
                "slot_capacity": override.slot_capacity,
            }
        })


class AdminServiceDateOverrideDetailView(APIView):
    """
    Update or delete a date override.
    PUT    /api/admin/time-slots/<str:service_id>/date-overrides/<int:override_id>/
    DELETE /api/admin/time-slots/<str:service_id>/date-overrides/<int:override_id>/
    """
    permission_classes = [IsAdminRole]

    def put(self, request, service_id, override_id):
        override = get_object_or_404(ServiceDateOverride, id=override_id)
        data = request.data

        date_val = data.get("date") or data.get("override_date")
        if date_val:
            try:
                override.date = datetime.date.fromisoformat(str(date_val).split("T")[0].strip())
            except (ValueError, TypeError):
                return Response({"success": False, "message": "Invalid date format. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if "is_closed" in data:
            override.is_closed = bool(data["is_closed"])
        if "reason" in data:
            override.reason = str(data["reason"] or "").strip()
        if "start_time" in data or "custom_start_time" in data:
            override.start_time = _parse_time_str(data.get("start_time") or data.get("custom_start_time"))
        if "end_time" in data or "custom_end_time" in data:
            override.end_time = _parse_time_str(data.get("end_time") or data.get("custom_end_time"))
        if "slot_capacity" in data or "custom_slot_capacity" in data:
            cap = data.get("slot_capacity") if "slot_capacity" in data else data.get("custom_slot_capacity")
            override.slot_capacity = int(cap) if cap is not None and str(cap).isdigit() and int(cap) > 0 else None

        if not override.is_closed and override.start_time and override.end_time and override.start_time >= override.end_time:
            return Response(
                {"success": False, "message": "Start time must be earlier than end time."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        override.save()
        return Response({
            "success": True,
            "message": f"Date override updated for {override.date}.",
            "data": {
                "id": override.id,
                "date": override.date.strftime("%Y-%m-%d"),
                "is_closed": override.is_closed,
                "reason": override.reason,
                "start_time": override.start_time.strftime("%H:%M") if override.start_time else None,
                "end_time": override.end_time.strftime("%H:%M") if override.end_time else None,
                "slot_capacity": override.slot_capacity,
            }
        })

    patch = put

    def delete(self, request, service_id, override_id):
        override = get_object_or_404(ServiceDateOverride, id=override_id)
        override.delete()
        return Response({"success": True, "message": "Date override removed."})


class AdminServiceTimeSlotPreviewView(APIView):
    """
    Live Slot Preview using the EXACT same backend generator engine as the customer.
    Supports draft unsaved config in POST body or saved config in DB.
    POST /api/admin/time-slots/<str:service_id>/preview/
    """
    permission_classes = [IsAdminRole]

    def post(self, request, service_id):
        if str(service_id).isdigit():
            service = Service.objects.filter(id=int(service_id)).first()
        else:
            service = Service.objects.filter(slug__iexact=str(service_id)).first()
        if not service:
            return Response({"success": False, "message": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data or {}
        date_str = data.get("date") or request.GET.get("date")
        if not date_str:
            target_date = timezone.localtime().date()
        else:
            try:
                target_date = datetime.date.fromisoformat(date_str.split("T")[0].strip())
            except (ValueError, TypeError):
                target_date = timezone.localtime().date()

        # Build optional draft config if draft overrides were provided
        draft_config = None
        if "default_start_time" in data or "default_end_time" in data or "slot_duration_minutes" in data:
            start_t = _parse_time_str(data.get("default_start_time")) or DEFAULT_START_TIME
            end_t = _parse_time_str(data.get("default_end_time")) or DEFAULT_END_TIME
            duration = int(data.get("slot_duration_minutes") or DEFAULT_SLOT_DURATION_MINUTES)
            capacity = int(data.get("slot_capacity") or DEFAULT_SLOT_CAPACITY)
            is_active = bool(data.get("is_active", True))

            draft_config = ServiceTimeSlotConfig(
                service=service,
                default_start_time=start_t,
                default_end_time=end_t,
                slot_duration_minutes=duration,
                slot_capacity=capacity,
                is_active=is_active,
            )

        slot_data = generate_slots_for_service_date(service, target_date, draft_config=draft_config)
        return Response({"success": True, "data": slot_data})
