"""
service_requests/services/inspection_service.py

Domain service for Technician Inspection, Findings, and Photos management.
Guarantees structured findings storage and transactional integrity.
"""
import logging
from typing import Optional, List, Dict, Any
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from service_requests.models import (
    ServiceRequest,
    Estimation,
    Inspection,
    InspectionFinding,
    InspectionPhoto,
    Service,
)
from service_requests.services.outbox_service import OutboxService

logger = logging.getLogger("service_requests.inspection")


class InspectionService:
    @staticmethod
    def start_inspection(
        estimation: Estimation,
        technician_user=None,
        technician_id: str = "",
        technician_name: str = "",
        technician_phone: str = "",
    ) -> Inspection:
        """
        Starts or retrieves an active on-site technician inspection.
        """
        with transaction.atomic():
            inspection, created = Inspection.objects.get_or_create(
                estimation=estimation,
                defaults={
                    "technician": technician_user,
                    "technician_external_id": technician_id,
                    "technician_name": technician_name,
                    "technician_phone": technician_phone,
                    "status": Inspection.Status.IN_PROGRESS,
                    "started_at": timezone.now(),
                }
            )
            if not created and inspection.status == Inspection.Status.PENDING:
                inspection.status = Inspection.Status.IN_PROGRESS
                inspection.started_at = timezone.now()
                if technician_user:
                    inspection.technician = technician_user
                if technician_id:
                    inspection.technician_external_id = technician_id
                if technician_name:
                    inspection.technician_name = technician_name
                if technician_phone:
                    inspection.technician_phone = technician_phone
                inspection.save()

            estimation.status = Estimation.Status.INSPECTION_IN_PROGRESS
            estimation.save(update_fields=["status", "updated_at"])

            sr = estimation.service_request
            sr.status = ServiceRequest.Status.INSPECTION_IN_PROGRESS
            sr.save(update_fields=["status", "updated_at"])

            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="inspection.started",
                payload={
                    "request_id": sr.request_id,
                    "estimation_id": estimation.id,
                    "inspection_id": inspection.id,
                    "technician_name": inspection.technician_name,
                    "status": inspection.status,
                },
                version=3,
            )
            return inspection

    @staticmethod
    def add_finding(
        inspection: Inspection,
        finding_data: Dict[str, Any],
    ) -> InspectionFinding:
        """
        Adds a structured diagnosis finding to the inspection report.
        """
        finding_type = str(finding_data.get("finding_type") or "Issue").strip()
        title = str(finding_data.get("title") or finding_type).strip()
        diagnosis = str(finding_data.get("diagnosis") or "").strip()
        severity = str(finding_data.get("severity") or InspectionFinding.Severity.MEDIUM).strip().upper()
        if severity not in InspectionFinding.Severity.values:
            severity = InspectionFinding.Severity.MEDIUM

        service_instance = None
        service_id = finding_data.get("service") or finding_data.get("service_id")
        if service_id:
            if isinstance(service_id, Service):
                service_instance = service_id
            elif str(service_id).isdigit():
                service_instance = Service.objects.filter(pk=int(service_id)).first()

        finding = InspectionFinding.objects.create(
            inspection=inspection,
            service=service_instance,
            finding_type=finding_type,
            title=title,
            diagnosis=diagnosis,
            severity=severity,
            description=finding_data.get("description", ""),
            recommended_action=finding_data.get("recommended_action", ""),
            quantity=finding_data.get("quantity", 1),
            unit=finding_data.get("unit", "unit"),
            sort_order=finding_data.get("sort_order", 0),
        )
        return finding

    @staticmethod
    def add_photo(
        inspection: Inspection,
        photo_file,
        caption: str = "",
        finding: Optional[InspectionFinding] = None,
        uploaded_by: str = "",
    ) -> InspectionPhoto:
        """
        Attaches a photo to the inspection (and optionally to a finding).
        """
        photo = InspectionPhoto.objects.create(
            inspection=inspection,
            finding=finding,
            photo=photo_file,
            caption=caption,
            uploaded_by=uploaded_by,
        )
        return photo

    @staticmethod
    def complete_inspection(
        inspection: Inspection,
        diagnosis: str = "",
        notes: str = "",
    ) -> Inspection:
        """
        Finalizes an inspection and prepares the workflow for quotation generation.
        """
        with transaction.atomic():
            inspection.status = Inspection.Status.COMPLETED
            inspection.completed_at = timezone.now()
            if diagnosis:
                inspection.diagnosis = diagnosis
            if notes:
                inspection.notes = notes
            inspection.save(update_fields=["status", "completed_at", "diagnosis", "notes", "updated_at"])

            estimation = inspection.estimation
            estimation.status = Estimation.Status.INSPECTION_COMPLETED
            estimation.save(update_fields=["status", "updated_at"])

            sr = estimation.service_request
            sr.status = ServiceRequest.Status.INSPECTION_COMPLETED
            sr.save(update_fields=["status", "updated_at"])

            OutboxService.record_event(
                aggregate_type="ServiceRequest",
                aggregate_id=sr.request_id,
                event_type="inspection.completed",
                payload={
                    "request_id": sr.request_id,
                    "estimation_id": estimation.id,
                    "inspection_id": inspection.id,
                    "findings_count": inspection.findings.count(),
                    "status": inspection.status,
                },
                version=4,
            )
            return inspection
