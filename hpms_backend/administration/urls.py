from django.urls import path

from .views import (
    DashboardStatsView,
    UserListView,
    CreateUserView,
    ToggleUserStatusView,
    AuditLogView,
    AnalyticsView,
    InventoryListCreateView,
    InventoryDetailView,
)

urlpatterns = [
    path("stats/", DashboardStatsView.as_view()),
    path("users/", UserListView.as_view()),
    path("users/create/", CreateUserView.as_view()),
    path("toggle-user/<int:pk>/", ToggleUserStatusView.as_view()),
    path("logs/", AuditLogView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
    path("inventory/", InventoryListCreateView.as_view()),
    path("inventory/<int:pk>/", InventoryDetailView.as_view()),
]
