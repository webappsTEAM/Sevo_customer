"""
URLs for Platform Control (/api/platform/)
"""
from django.urls import path
from .views import (
    PlatformDashboardSummaryView,
    PlatformRBACMatrixView,
    PlatformUsersListView,
    PlatformUserInviteView,
    PlatformUserDetailView,
    PlatformCustomerStatusView,
    PlatformCustomerMergePreviewView,
    PlatformCustomerMergeExecuteView,
    PlatformSecurityOverviewView,
    PlatformSessionRevokeView,
    PlatformAuditListView,
)

urlpatterns = [
    path("dashboard/summary/", PlatformDashboardSummaryView.as_view(), name="platform-dashboard-summary"),
    path("rbac/matrix/", PlatformRBACMatrixView.as_view(), name="platform-rbac-matrix"),
    path("users/", PlatformUsersListView.as_view(), name="platform-users-list"),
    path("users/invite/", PlatformUserInviteView.as_view(), name="platform-users-invite"),
    path("users/<int:pk>/", PlatformUserDetailView.as_view(), name="platform-user-detail"),
    path("customers/<int:pk>/status/", PlatformCustomerStatusView.as_view(), name="platform-customer-status"),
    path("customers/merge-preview/", PlatformCustomerMergePreviewView.as_view(), name="platform-customer-merge-preview"),
    path("customers/merge/", PlatformCustomerMergeExecuteView.as_view(), name="platform-customer-merge-execute"),
    path("security/overview/", PlatformSecurityOverviewView.as_view(), name="platform-security-overview"),
    path("security/sessions/revoke/", PlatformSessionRevokeView.as_view(), name="platform-security-session-revoke"),
    path("audit/", PlatformAuditListView.as_view(), name="platform-audit-list"),
]
