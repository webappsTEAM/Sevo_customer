"""
service_requests/technician_views.py

Authoritative backend endpoints for the Technician Application:
1. Available & Active Bookings discovery
2. Atomic, authenticated Booking Acceptance
3. Real-time GPS Telemetry Streaming (navigator.geolocation.watchPosition ingestion)
4. Turn-by-turn Service Lifecycle Transitions (on_the_way -> arrived -> in_progress -> completed)
5. Customer Service Start OTP Verification
"""

import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ServiceRequest, BookingAssignment, TechnicianLocation
from .notifications import broadcast_tracking_event
from .views import _build_tracking_payload, _haversine_meters

logger = logging.getLogger("service_requests.technician")

# Movement filtering thresholds (requirement: avoid unnecessary DB writes for
# GPS noise while still capturing every real movement / status-relevant update).
MIN_MOVE_METERS = 8.0
MIN_UPDATE_INTERVAL_SECONDS = 3.0
MIN_HEADING_DELTA_DEGREES = 20.0


def _resolve_sr(pk=None, identifier=None):
    sr_id = pk or identifier
    if not sr_id:
        return None
    clean_id = str(sr_id).replace("#", "").strip()
    if clean_id.isdigit():
        sr = ServiceRequest.objects.filter(pk=int(clean_id)).first()
        if sr:
            return sr
    return ServiceRequest.objects.filter(request_id__iexact=clean_id).first()


def _technician_ref(user):
    """
    The stable string this backend uses to identify a technician on a
    BookingAssignment. Kept in one place so ownership checks and assignment
    writes can never drift apart.
    """
    return f"TECH-{user.id:04d}"


def _get_technician_identity(request):
    """
    Resolves the authenticated technician's real identity from the database.
    Callers of every view in this module are required to be authenticated
    (permission_classes = [IsAuthenticated]), so `request.user` is always a
    real, logged-in technician here — never data supplied by the client.
    """
    user = request.user
    name = user.get_full_name() or user.username
    phone = getattr(user, "phone", None) or getattr(user, "mobile_number", None) or ""
    photo = None
    try:
        if getattr(user, "avatar", None) and bool(user.avatar):
            photo = user.avatar.url
    except Exception:
        photo = None
    rating = getattr(user, "rating", None) or None
    tech_id = _technician_ref(user)
    return user, name, phone, photo, rating, tech_id


def _assigned_technician_ref(sr):
    """
    The technician reference currently holding this booking, or "".

    ServiceRequest used to carry a `technician` FK. It was removed when
    technician identity moved to the snapshot/assignment model (the same
    refactor that left technician_name/phone/photo/rating behind), so
    ownership is now read from the accepted BookingAssignment -- which is
    where it was already being written.
    """
    assignment = sr.assignments.filter(
        status__in=[
            BookingAssignment.Status.ACCEPTED,
            getattr(BookingAssignment.Status, "COMPLETED", BookingAssignment.Status.ACCEPTED),
        ]
    ).order_by("-id").first()
    return (assignment.technician_id or "") if assignment else ""


def _forbidden_if_not_owner(sr, user):
    """
    Ownership enforcement: once a booking has an assigned technician, only that
    same authenticated technician may update its status/location/OTP. Prevents
    Technician B's device from ever writing into Technician A's active booking.
    """
    holder = _assigned_technician_ref(sr)
    if holder and holder != _technician_ref(user):
        return Response(
            {"success": False, "error": "This booking is assigned to a different technician."},
            status=status.HTTP_403_FORBIDDEN
        )
    return None


class TechnicianAvailableBookingsView(APIView):
    """
    GET /api/technician/bookings/
    Returns:
      - available: Unaccepted, confirmed bookings ready for acceptance
      - active: Bookings currently accepted/in-progress by this technician
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user, name, phone, photo, rating, tech_id = _get_technician_identity(request)
        tab = request.query_params.get("tab", "all")

        base_qs = ServiceRequest.objects.all().order_by("-created_at")

        # Available jobs: status confirmed or assigned, not completed/cancelled
        available_statuses = ["confirmed", "new_request", "assigned"]
        active_statuses = ["accepted", "on_the_way", "arrived", "in_progress"]

        available_bookings = base_qs.filter(status__in=available_statuses)[:30]

        # Active bookings: strictly scoped to this authenticated technician.
        # Was `filter(technician=user, ...)`, which raised FieldError on every
        # request once the `technician` FK was removed from the model -- this
        # endpoint returned a 500 rather than a booking list. Scoped through
        # the accepted BookingAssignment instead, which is where the
        # technician reference actually lives now.
        active_bookings = base_qs.filter(
            assignments__technician_id=tech_id,
            assignments__status=BookingAssignment.Status.ACCEPTED,
            status__in=active_statuses,
        ).distinct()

        def serialize_item(sr):
            # Build cart items with safe float conversion on price.
            # Three different schemas exist in cart_data:
            #   (a) booking frontend: {name, price, quantity, categoryName, ...}
            #   (b) AC quotation: {title, unit_price, quantity, type, line_total, ...}
            #   (c) logistics: {name, price, quantity, ...}
            cart_items = []
            for item in (sr.cart_data or []):
                if isinstance(item, dict):
                    raw_price = item.get("price") or item.get("unit_price") or item.get("line_total") or 0
                    try:
                        price = float(raw_price)
                    except (TypeError, ValueError):
                        price = 0.0
                    cart_items.append({
                        "id": item.get("id") or item.get("serviceId") or "",
                        "name": item.get("name") or item.get("serviceName") or item.get("title") or "",
                        "category": item.get("categoryName") or item.get("category") or item.get("type") or "",
                        "quantity": item.get("quantity") or item.get("qty") or 1,
                        "price": price,
                        "unit": item.get("unit") or item.get("priceUnit") or "",
                        "description": item.get("description") or "",
                        "selected_area": item.get("selectedArea") or item.get("area") or None,
                        "ac_type": item.get("acType") or item.get("ac_type") or "",
                    })

            return {
                "id": sr.id,
                "request_id": sr.request_id,
                "workforce_job_id": getattr(sr, "workforce_job_id", "") or "",
                "job_type": getattr(sr, "job_type", "") or "",
                "service_category": sr.service_category,
                "issue_title": sr.issue_title,
                "description": sr.description,
                "customer_name": sr.customer_name,
                "customer_phone": sr.phone,
                "customer_email": sr.email or "",
                # Pickup / service address
                "address": sr.address,
                "latitude": float(sr.latitude) if sr.latitude else None,
                "longitude": float(sr.longitude) if sr.longitude else None,
                # Drop-off address (Goods & Transport / logistics bookings)
                "drop_address": getattr(sr, "drop_address", "") or "",
                "drop_latitude": float(sr.drop_latitude) if getattr(sr, "drop_latitude", None) else None,
                "drop_longitude": float(sr.drop_longitude) if getattr(sr, "drop_longitude", None) else None,
                "drop_contact_name": getattr(sr, "drop_contact_name", "") or "",
                "drop_contact_phone": getattr(sr, "drop_contact_phone", "") or "",
                # Schedule
                "preferred_date": str(sr.preferred_date) if sr.preferred_date else "",
                "preferred_time": sr.preferred_time or "",
                # Payment
                "total_amount": float(sr.total_amount) if sr.total_amount else 0.0,
                "subtotal_amount": float(sr.subtotal_amount) if getattr(sr, "subtotal_amount", None) else None,
                "discount_amount": float(sr.discount_amount) if getattr(sr, "discount_amount", None) else 0.0,
                "payment_method": sr.payment_method or "COD",
                "payment_status": sr.payment_status or "pending",
                "fare_breakdown": sr.fare_breakdown if getattr(sr, "fare_breakdown", None) else {},
                # Service line items booked by the customer
                "cart_data": sr.cart_data or [],
                "cart_items": cart_items,
                # Status
                "status": sr.status,
                "dispatch_status": getattr(sr, "dispatch_status", "") or "",
                "created_at": sr.created_at.isoformat() if sr.created_at else None,
                "updated_at": sr.updated_at.isoformat() if sr.updated_at else None,
                # Technician snapshot (meaningful when booking is active/accepted)
                "technician_name": sr.technician_name,
                "technician_phone": sr.technician_phone,
                "technician_photo": sr.technician_photo or "",
                "technician_rating": float(sr.technician_rating) if sr.technician_rating else None,
                "technician_latitude": float(sr.technician_latitude) if getattr(sr, "technician_latitude", None) else None,
                "technician_longitude": float(sr.technician_longitude) if getattr(sr, "technician_longitude", None) else None,
                # OTP & tracking
                "start_otp": sr.start_otp,
                "otp_verified": getattr(sr, "otp_verified", False),
                "tracking_token": str(sr.tracking_token) if sr.tracking_token else None,
            }

        return Response({
            "success": True,
            "data": {
                "available": [serialize_item(b) for b in available_bookings],
                "active": [serialize_item(b) for b in active_bookings],
                "technician_profile": {
                    "id": tech_id,
                    "name": name,
                    "phone": phone,
                    "photo": photo,
                    "rating": float(rating) if rating is not None else None,
                }
            }
        })


class TechnicianAcceptBookingView(APIView):
    """
    POST /api/technician/bookings/<id>/accept/
    Atomically updates booking in database:
      - status = "accepted"
      - technician = authenticated technician
      - technician_name, technician_phone, technician_photo, technician_rating
      - accepted_at = timezone.now()
    Broadcasts real-time WebSocket event to Customer App group.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None, identifier=None):
        sr = _resolve_sr(pk, identifier)
        if not sr:
            return Response({"success": False, "error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        user, name, phone, photo, rating, tech_id = _get_technician_identity(request)

        with transaction.atomic():
            # Lock the record
            sr = ServiceRequest.objects.select_for_update().get(pk=sr.pk)

            # Prevent double-acceptance
            if sr.status in ["completed", "closed", "cancelled", "rejected"]:
                return Response(
                    {"success": False, "error": f"Cannot accept booking in '{sr.status}' state"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # If already accepted by someone else
            _holder = _assigned_technician_ref(sr)
            if _holder and _holder != tech_id:
                return Response(
                    {"success": False, "error": "Booking has already been accepted by another technician"},
                    status=status.HTTP_409_CONFLICT
                )

            # Update booking — technician identity comes strictly from the
            # authenticated backend user, never from client-supplied fields.
            sr.status = ServiceRequest.Status.ACCEPTED
            # `sr.technician` (FK) and `sr.accepted_at` no longer exist --
            # identity is the snapshot below plus the BookingAssignment
            # created at the end of this block, which carries accepted_at.
            sr.technician_name = name or ""
            sr.technician_phone = phone or ""
            sr.technician_photo = photo or ""
            sr.technician_rating = rating

            # Record initial GPS if provided in accept request or from user's last known location
            raw_lat = request.data.get("latitude") or request.data.get("lat")
            raw_lng = request.data.get("longitude") or request.data.get("lng")
            if not (raw_lat and raw_lng) and user and getattr(user, "last_known_location", None):
                try:
                    if isinstance(user.last_known_location, dict):
                        raw_lat = user.last_known_location.get("latitude")
                        raw_lng = user.last_known_location.get("longitude")
                except Exception:
                    pass

            if raw_lat is not None and raw_lng is not None:
                try:
                    from decimal import Decimal
                    valid_lat = Decimal(str(raw_lat))
                    valid_lng = Decimal(str(raw_lng))
                    if -90.0 <= valid_lat <= 90.0 and -180.0 <= valid_lng <= 180.0 and not (valid_lat == 0 and valid_lng == 0):
                        sr.technician_latitude = valid_lat
                        sr.technician_longitude = valid_lng
                        # heading/speed/accuracy and the update timestamp were
                        # denormalised columns on ServiceRequest that no longer
                        # exist. TechnicianLocation is the authoritative record
                        # for per-fix telemetry and always was -- these lines
                        # were duplicating it.
                        TechnicianLocation.objects.create(
                            booking=sr,
                            technician=user,
                            latitude=valid_lat,
                            longitude=valid_lng,
                            heading=float(request.data.get("heading", 0.0) or 0.0),
                            speed=float(request.data.get("speed", 0.0) or 0.0),
                            accuracy=float(request.data.get("accuracy", 10.0) or 10.0),
                        )
                except Exception as loc_e:
                    logger.warning(f"[Technician Accept] Failed to record initial GPS: {loc_e}")
            
            # Ensure Start OTP exists
            if not sr.start_otp:
                import random
                sr.start_otp = f"{random.randint(1000, 9999)}"

            sr.save()

            # Record or update BookingAssignment
            assignment, _ = BookingAssignment.objects.get_or_create(
                booking=sr,
                status=BookingAssignment.Status.ACCEPTED,
                defaults={
                    "technician_id": str(tech_id),
                    "technician_name": name or "",
                    "technician_phone": phone or "",
                    "technician_photo": photo or "",
                    "technician_rating": rating,
                    "accepted_at": timezone.now(),
                }
            )

        # Broadcast WebSocket event to Customer App group
        payload = _build_tracking_payload(sr, has_full_access=True)
        broadcast_tracking_event(sr, "technician_accepted", payload)
        broadcast_tracking_event(sr, "job_updated", payload)
        broadcast_tracking_event(sr, "technician_location_updated", payload)

        logger.info(f"[Technician Accept] Booking #{sr.request_id} accepted by {name} ({tech_id}) with GPS: ({sr.technician_latitude}, {sr.technician_longitude})")

        return Response({
            "success": True,
            "message": f"Booking #{sr.request_id} accepted successfully!",
            "data": payload
        }, status=status.HTTP_200_OK)


class TechnicianUpdateLocationView(APIView):
    """
    POST /api/technician/bookings/<id>/location/
    Ingests live GPS coordinates from technician's device (navigator.geolocation.watchPosition):
      - latitude, longitude, accuracy, heading, speed, location_name
    Saves TechnicianLocation telemetry point and broadcasts real-time position to Customer App.

    Ownership: only the technician actually assigned to this booking (sr.technician)
    may write its location — enforced below so Technician B's device can never
    appear on Technician A's booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None, identifier=None):
        sr = _resolve_sr(pk, identifier)
        if not sr:
            return Response({"success": False, "error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        user, _, _, _, _, _ = _get_technician_identity(request)

        forbidden = _forbidden_if_not_owner(sr, user)
        if forbidden:
            return forbidden

        # Allow location updates while booking is active
        active_statuses = ["accepted", "on_the_way", "arrived", "in_progress"]
        if sr.status not in active_statuses:
            return Response(
                {"success": False, "error": f"Location streaming inactive for status '{sr.status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lat = float(request.data.get("latitude"))
            lng = float(request.data.get("longitude"))
        except (TypeError, ValueError):
            return Response({"success": False, "error": "Invalid latitude/longitude coordinates"}, status=status.HTTP_400_BAD_REQUEST)

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            return Response({"success": False, "error": "Coordinates out of geographic range"}, status=status.HTTP_400_BAD_REQUEST)

        accuracy = request.data.get("accuracy")
        heading = float(request.data.get("heading") or 0.0)
        speed = float(request.data.get("speed") or 0.0)
        location_name = request.data.get("location_name") or sr.technician_location_name or ""

        # Movement filtering: skip the DB write (and broadcast) for GPS noise —
        # points that moved a negligible distance, arrived faster than the min
        # interval, and didn't change heading meaningfully. A status change
        # (accepted -> on_the_way) always writes through regardless.
        now = timezone.now()
        prev_lat = float(sr.technician_latitude) if sr.technician_latitude is not None else None
        prev_lng = float(sr.technician_longitude) if sr.technician_longitude is not None else None
        will_transition_status = sr.status == "accepted"
        # The previous fix's timestamp and heading used to be denormalised
        # onto ServiceRequest; those columns were removed. TechnicianLocation
        # is the authoritative per-fix record, so read the last one from
        # there instead of re-adding duplicate columns.
        last_fix = TechnicianLocation.objects.filter(booking=sr).order_by("-created_at").first()
        if prev_lat is not None and prev_lng is not None and last_fix and not will_transition_status:
            distance = _haversine_meters(prev_lat, prev_lng, lat, lng) or 0.0
            elapsed = (now - last_fix.created_at).total_seconds()
            heading_delta = abs(((heading - float(last_fix.heading or 0.0)) + 180) % 360 - 180)
            if distance < MIN_MOVE_METERS and elapsed < MIN_UPDATE_INTERVAL_SECONDS and heading_delta < MIN_HEADING_DELTA_DEGREES:
                payload = _build_tracking_payload(sr, has_full_access=True)
                return Response({"success": True, "data": payload}, status=status.HTTP_200_OK)

        # Update ServiceRequest
        sr.technician_latitude = Decimal(str(round(lat, 6)))
        sr.technician_longitude = Decimal(str(round(lng, 6)))
        # heading/speed/accuracy/updated_at live on TechnicianLocation now
        # (written below), not as duplicate columns here.
        if location_name:
            sr.technician_location_name = location_name

        # If currently accepted and moving, transition to on_the_way
        if sr.status == "accepted":
            sr.status = ServiceRequest.Status.ON_THE_WAY

        sr.save(update_fields=[
            "technician_latitude", "technician_longitude",
            "technician_location_name", "status", "updated_at"
        ])

        # Log telemetry history -- the authoritative per-fix record.
        # captured_at is stamped even though this transport has no device
        # timestamp of its own: `now` is the closest thing to a capture time
        # for a fix posted directly by the device, and stamping it keeps this
        # path and the vendor webhook comparable on one ordering key. Leaving
        # it null would make every fix written here look older than any
        # webhook fix that carries a real capture time.
        TechnicianLocation.objects.create(
            booking=sr,
            technician=user,
            latitude=sr.technician_latitude,
            longitude=sr.technician_longitude,
            accuracy=float(accuracy) if accuracy is not None else None,
            heading=heading,
            speed=speed,
            captured_at=now,
        )

        logger.info(f"[TRACKING] Location saved: booking_id={sr.id}, lat={lat}, lng={lng}")

        # Broadcast live GPS update to Customer App via Channels
        payload = _build_tracking_payload(sr, has_full_access=True)
        broadcast_tracking_event(sr, "technician_location_updated", payload)
        logger.info(f"[TRACKING] Realtime event broadcast: booking_id={sr.id}, request_id={sr.request_id}")

        return Response({
            "success": True,
            "data": payload
        }, status=status.HTTP_200_OK)


class TechnicianStatusUpdateView(APIView):
    """
    POST /api/technician/bookings/<id>/status/
    Transitions booking lifecycle status:
      - 'on_the_way'
      - 'arrived'
      - 'in_progress' (Requires matching OTP)
      - 'completed'
      - 'cancelled'
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None, identifier=None):
        sr = _resolve_sr(pk, identifier)
        if not sr:
            return Response({"success": False, "error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        user, _, _, _, _, _ = _get_technician_identity(request)
        forbidden = _forbidden_if_not_owner(sr, user)
        if forbidden:
            return forbidden

        target_status = (request.data.get("status") or "").lower().strip()
        entered_otp = str(request.data.get("otp") or "").strip()

        valid_targets = {"on_the_way", "arrived", "in_progress", "completed", "cancelled"}
        if target_status not in valid_targets:
            return Response(
                {"success": False, "error": f"Invalid target status '{target_status}'. Must be one of: {list(valid_targets)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()

        if target_status == "on_the_way":
            sr.status = ServiceRequest.Status.ON_THE_WAY
        elif target_status == "arrived":
            sr.status = ServiceRequest.Status.ARRIVED
            # sr.technician_arrived_at was removed; the ARRIVED status change
            # itself (and its status_events entry) is the record of arrival.
        elif target_status == "in_progress":
            # OTP verification check
            if sr.start_otp:
                if not entered_otp:
                    return Response({
                        "success": False,
                        "error": "Service Start OTP is required to start work. Ask customer for the 4-digit OTP code."
                    }, status=status.HTTP_400_BAD_REQUEST)

                if entered_otp != str(sr.start_otp).strip():
                    sr.otp_attempt_count += 1
                    sr.save(update_fields=["otp_attempt_count", "updated_at"])
                    return Response({
                        "success": False,
                        "error": "Invalid OTP code provided. Please verify with customer."
                    }, status=status.HTTP_400_BAD_REQUEST)

                sr.otp_verified = True
                sr.otp_verified_at = now

            sr.status = ServiceRequest.Status.IN_PROGRESS
        elif target_status == "completed":
            sr.status = ServiceRequest.Status.COMPLETED
            BookingAssignment.objects.filter(booking=sr, status=BookingAssignment.Status.ACCEPTED).update(
                status=BookingAssignment.Status.COMPLETED
            )
        elif target_status == "cancelled":
            sr.status = ServiceRequest.Status.CANCELLED
            sr.cancelled_at = now

        sr.save()

        # Broadcast status change to customer
        payload = _build_tracking_payload(sr, has_full_access=True)
        broadcast_tracking_event(sr, "technician_status_updated", payload)
        broadcast_tracking_event(sr, "job_updated", payload)

        return Response({
            "success": True,
            "message": f"Status updated to '{sr.status}'",
            "data": payload
        }, status=status.HTTP_200_OK)


class TechnicianVerifyStartOTPView(APIView):
    """
    POST /api/technician/bookings/<id>/verify-otp/
    Explicit endpoint for verifying Service Start OTP from the technician app.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None, identifier=None):
        sr = _resolve_sr(pk, identifier)
        if not sr:
            return Response({"success": False, "error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        user, _, _, _, _, _ = _get_technician_identity(request)
        forbidden = _forbidden_if_not_owner(sr, user)
        if forbidden:
            return forbidden

        entered_otp = str(request.data.get("otp") or "").strip()
        if not entered_otp:
            return Response({"success": False, "error": "OTP is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not sr.start_otp:
            return Response({"success": False, "error": "No Start OTP configured on booking"}, status=status.HTTP_400_BAD_REQUEST)

        if entered_otp != str(sr.start_otp).strip():
            sr.otp_attempt_count += 1
            sr.save(update_fields=["otp_attempt_count", "updated_at"])
            return Response({
                "success": False,
                "error": "Invalid Service Start OTP code"
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        sr.otp_verified = True
        sr.otp_verified_at = now
        sr.status = ServiceRequest.Status.IN_PROGRESS
        sr.save(update_fields=["otp_verified", "otp_verified_at", "status", "updated_at"])

        payload = _build_tracking_payload(sr, has_full_access=True)
        broadcast_tracking_event(sr, "otp_verification_success", payload)
        broadcast_tracking_event(sr, "technician_status_updated", payload)

        return Response({
            "success": True,
            "message": "Service Start OTP verified successfully. Work has begun!",
            "data": payload
        }, status=status.HTTP_200_OK)


class TechnicianBookingDetailView(APIView):
    """
    GET /api/technician/bookings/<id>/
    Returns the full detail of a single booking for the technician app,
    including all cart line items, fare breakdown, trip stops, and the
    technician's own assignment status on this booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None, identifier=None):
        sr = _resolve_sr(pk, identifier)
        if not sr:
            return Response({"success": False, "error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        user, _, _, _, _, tech_id = _get_technician_identity(request)

        # Resolve this technician's own assignment record (if any)
        my_assignment = sr.assignments.filter(
            technician_id=tech_id
        ).order_by("-id").first()

        # Cart items — normalised view of raw cart_data JSON.
        # Three different schemas exist in cart_data:
        #   (a) booking frontend: {name, price, quantity, categoryName, ...}
        #   (b) AC quotation: {title, unit_price, quantity, type, line_total, ...}
        #   (c) logistics: {name, price, quantity, ...}
        cart_items = []
        for item in (sr.cart_data or []):
            if isinstance(item, dict):
                raw_price = item.get("price") or item.get("unit_price") or item.get("line_total") or 0
                try:
                    price = float(raw_price)
                except (TypeError, ValueError):
                    price = 0.0
                cart_items.append({
                    "id": item.get("id") or item.get("serviceId") or "",
                    "name": item.get("name") or item.get("serviceName") or item.get("title") or "",
                    "category": item.get("categoryName") or item.get("category") or item.get("type") or "",
                    "quantity": item.get("quantity") or item.get("qty") or 1,
                    "price": price,
                    "unit": item.get("unit") or item.get("priceUnit") or "",
                    "description": item.get("description") or "",
                    "selected_area": item.get("selectedArea") or item.get("area") or None,
                    "ac_type": item.get("acType") or item.get("ac_type") or "",
                    "ac_brand": item.get("acBrand") or item.get("ac_brand") or "",
                    "ac_capacity": item.get("acCapacity") or item.get("ac_capacity") or "",
                })

        # Trip stops (for logistics / Goods & Transport bookings)
        trip_stops = []
        try:
            for stop in sr.trip_stops.all().order_by("sequence"):
                trip_stops.append({
                    "id": stop.id,
                    "sequence": stop.sequence,
                    "address": stop.address,
                    "contact_name": stop.contact_name or "",
                    "contact_phone": stop.contact_phone or "",
                    "latitude": float(stop.latitude) if stop.latitude else None,
                    "longitude": float(stop.longitude) if stop.longitude else None,
                    "stop_type": getattr(stop, "stop_type", "") or "",
                    "status": getattr(stop, "status", "") or "",
                })
        except Exception:
            pass

        data = {
            "id": sr.id,
            "request_id": sr.request_id,
            "workforce_job_id": getattr(sr, "workforce_job_id", "") or "",
            "job_type": getattr(sr, "job_type", "") or "",
            "service_category": sr.service_category,
            "issue_title": sr.issue_title,
            "description": sr.description,
            # Customer contact
            "customer_name": sr.customer_name,
            "customer_phone": sr.phone,
            "customer_email": sr.email or "",
            # Pickup / service address
            "address": sr.address,
            "latitude": float(sr.latitude) if sr.latitude else None,
            "longitude": float(sr.longitude) if sr.longitude else None,
            # Drop-off (logistics)
            "drop_address": getattr(sr, "drop_address", "") or "",
            "drop_latitude": float(sr.drop_latitude) if getattr(sr, "drop_latitude", None) else None,
            "drop_longitude": float(sr.drop_longitude) if getattr(sr, "drop_longitude", None) else None,
            "drop_contact_name": getattr(sr, "drop_contact_name", "") or "",
            "drop_contact_phone": getattr(sr, "drop_contact_phone", "") or "",
            "trip_stops": trip_stops,
            # Schedule
            "preferred_date": str(sr.preferred_date) if sr.preferred_date else "",
            "preferred_time": sr.preferred_time or "",
            # Payment
            "total_amount": float(sr.total_amount) if sr.total_amount else 0.0,
            "subtotal_amount": float(sr.subtotal_amount) if getattr(sr, "subtotal_amount", None) else None,
            "discount_amount": float(sr.discount_amount) if getattr(sr, "discount_amount", None) else 0.0,
            "payment_method": sr.payment_method or "COD",
            "payment_status": sr.payment_status or "pending",
            "fare_breakdown": sr.fare_breakdown if getattr(sr, "fare_breakdown", None) else {},
            # Service line items booked by the customer
            "cart_data": sr.cart_data or [],
            "cart_items": cart_items,
            # Status
            "status": sr.status,
            "dispatch_status": getattr(sr, "dispatch_status", "") or "",
            "created_at": sr.created_at.isoformat() if sr.created_at else None,
            "updated_at": sr.updated_at.isoformat() if sr.updated_at else None,
            # Technician snapshot
            "technician_name": sr.technician_name,
            "technician_phone": sr.technician_phone,
            "technician_photo": sr.technician_photo or "",
            "technician_rating": float(sr.technician_rating) if sr.technician_rating else None,
            "technician_latitude": float(sr.technician_latitude) if getattr(sr, "technician_latitude", None) else None,
            "technician_longitude": float(sr.technician_longitude) if getattr(sr, "technician_longitude", None) else None,
            # OTP & tracking
            "start_otp": sr.start_otp,
            "otp_verified": getattr(sr, "otp_verified", False),
            "tracking_token": str(sr.tracking_token) if sr.tracking_token else None,
            # This technician's assignment state on this booking
            "my_assignment": {
                "status": my_assignment.status if my_assignment else None,
                "offered_at": my_assignment.offered_at.isoformat() if my_assignment and my_assignment.offered_at else None,
                "accepted_at": my_assignment.accepted_at.isoformat() if my_assignment and my_assignment.accepted_at else None,
            } if my_assignment else None,
        }

        return Response({"success": True, "data": data})
