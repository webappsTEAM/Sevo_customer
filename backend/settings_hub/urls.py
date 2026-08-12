from django.urls import path
from .views_catalog import ImageUploadView
from .views_catalog_v2 import (
    AdminCategoryListView, AdminCategoryDetailView,
    AdminServiceListView, AdminServiceDetailView,
    AdminPackageListView, AdminPackageDetailView, AdminPackageTransitionView,
    AdminAddOnListView, AdminAddOnDetailView,
    AdminCatalogChangeLogView,
)
from .views import (
    NotificationPreferenceView,
    SessionListView, SessionRevokeView, SessionRevokeAllView, LoginHistoryView,
    APIKeyListCreateView, APIKeyRevokeView,
    WebhookListCreateView, WebhookDetailView,
    TeamMembersView, TeamMemberDetailView,
    TeamInviteListCreateView, TeamInviteRevokeView,
    BillingSubscriptionView, InvoiceListView,
    DataExportView, AccountDeletionView, WorkspaceDeletionView, OwnerTransferView,
)

from service_requests.payment_views import InvoiceDownloadView

urlpatterns = [
    # Notifications
    path("notifications/", NotificationPreferenceView.as_view(), name="notification-prefs"),

    # Sessions
    path("sessions/", SessionListView.as_view(), name="session-list"),
    path("sessions/revoke-all/", SessionRevokeAllView.as_view(), name="session-revoke-all"),
    path("sessions/<int:pk>/", SessionRevokeView.as_view(), name="session-revoke"),
    path("login-history/", LoginHistoryView.as_view(), name="login-history"),

    # API Keys
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list"),
    path("api-keys/<int:pk>/", APIKeyRevokeView.as_view(), name="api-key-revoke"),

    # Webhooks
    path("webhooks/", WebhookListCreateView.as_view(), name="webhook-list"),
    path("webhooks/<int:pk>/", WebhookDetailView.as_view(), name="webhook-detail"),

    # Team
    path("team/members/", TeamMembersView.as_view(), name="team-members"),
    path("team/members/<str:pk>/", TeamMemberDetailView.as_view(), name="team-member-detail"),
    path("team/invites/", TeamInviteListCreateView.as_view(), name="team-invites"),
    path("team/invites/<int:pk>/", TeamInviteRevokeView.as_view(), name="team-invite-revoke"),

    # Billing
    path("billing/subscription/", BillingSubscriptionView.as_view(), name="billing-subscription"),
    path("invoices/", InvoiceListView.as_view(), name="invoice-list"),
    path("invoices/download/", InvoiceDownloadView.as_view(), name="settings-invoice-download"),

    # Catalog v2 (Category -> Service -> Package -> AddOn)
    path("catalog/upload-image/", ImageUploadView.as_view(), name="settings-catalog-upload-image"),
    path("catalog/v2/categories/", AdminCategoryListView.as_view(), name="settings-catalog-v2-categories-list"),
    path("catalog/v2/categories/<int:pk>/", AdminCategoryDetailView.as_view(), name="settings-catalog-v2-categories-detail"),
    path("catalog/v2/services/", AdminServiceListView.as_view(), name="settings-catalog-v2-services-list"),
    path("catalog/v2/services/<int:pk>/", AdminServiceDetailView.as_view(), name="settings-catalog-v2-services-detail"),
    path("catalog/v2/packages/", AdminPackageListView.as_view(), name="settings-catalog-v2-packages-list"),
    path("catalog/v2/packages/<int:pk>/", AdminPackageDetailView.as_view(), name="settings-catalog-v2-packages-detail"),
    path("catalog/v2/packages/<int:pk>/transition/", AdminPackageTransitionView.as_view(), name="settings-catalog-v2-packages-transition"),
    path("catalog/v2/addons/", AdminAddOnListView.as_view(), name="settings-catalog-v2-addons-list"),
    path("catalog/v2/addons/<int:pk>/", AdminAddOnDetailView.as_view(), name="settings-catalog-v2-addons-detail"),
    path("catalog/v2/change-log/", AdminCatalogChangeLogView.as_view(), name="settings-catalog-v2-change-log"),

    # Data / Privacy
    path("data/export/", DataExportView.as_view(), name="data-export"),
    path("data/delete-account/", AccountDeletionView.as_view(), name="account-deletion"),
    path("data/delete-workspace/", WorkspaceDeletionView.as_view(), name="workspace-deletion"),
    path("data/transfer-ownership/", OwnerTransferView.as_view(), name="owner-transfer"),
]
