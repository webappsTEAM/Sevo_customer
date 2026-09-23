from django.urls import path
from .views import (
    CustomerListView,
    CustomerDetailView,
    CustomerTimelineView,
    CustomerAnalyticsView,
    CustomerPaymentsView,
    CustomerExportView,
    CustomerMergeView,
    CustomerUnmergeView,
)

urlpatterns = [
    path("", CustomerListView.as_view(), name="customer-list"),
    path("<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
    path("<int:pk>/timeline/", CustomerTimelineView.as_view(), name="customer-timeline"),
    path("analytics/", CustomerAnalyticsView.as_view(), name="customer-analytics"),
    path("payments/", CustomerPaymentsView.as_view(), name="customer-payments"),
    path("export/", CustomerExportView.as_view(), name="customer-export"),
    path("merges/", CustomerMergeView.as_view(), name="customer-merges"),
    path("merges/unmerge/", CustomerUnmergeView.as_view(), name="customer-unmerge"),
]
