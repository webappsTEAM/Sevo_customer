# customer_analytics/constants.py
# Reference for all metrics definitions (v2 plan)

PENDING_STATUSES = [
    "new_request",
    "pending_payment",
    "waiting_for_payment",
    "confirmed",
    "reviewed",
    "assigned",
    "received",
    "accepted",
    "on_the_way",
    "arrived",
    "in_progress",
]

COMPLETED_STATUSES = [
    "completed",
    "awaiting_verification",
    "verified",
    "feedback_pending",
    "feedback_received",
    "closed",
]

CANCELLED_STATUSES = [
    "cancelled",
]
