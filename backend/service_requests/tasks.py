from celery import shared_task


@shared_task
def generate_due_amc_bookings():
    """
    HS-B-07: generates one ServiceRequest for every BookingSeries whose
    next_run_date has arrived. See generate_due_bookings() in
    service_requests/services/__init__.py for the full generation logic
    and its "no backdated catch-up" rule.

    Not wired to a schedule by this change -- this project's Celery beat
    scheduler is django_celery_beat's DatabaseScheduler (DB-driven
    PeriodicTask rows, not a static CELERY_BEAT_SCHEDULE dict), so
    registering the actual daily schedule is an admin/ops setup step
    (Django admin -> Periodic Tasks, or a `python manage.py shell` one-off)
    rather than something this migration should silently create by writing
    into django_celery_beat's own tables.
    """
    from service_requests.services import generate_due_bookings
    created, failed = generate_due_bookings()
    return f"AMC generation: {len(created)} booking(s) created, {len(failed)} series failed."
