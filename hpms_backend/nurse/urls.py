from django.urls import path
from .views import NurseQueueView, UpdateTaskStatusView, NurseVisitVitalsView

urlpatterns = [
    path("queue/", NurseQueueView.as_view()),
    path("update/<int:pk>/", UpdateTaskStatusView.as_view()),
    path("visit/<int:visit_id>/vitals/", NurseVisitVitalsView.as_view()),
]