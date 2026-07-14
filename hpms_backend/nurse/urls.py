from django.urls import path
from .views import NurseQueueView, UpdateTaskStatusView, NurseVisitVitalsView, CommitNotesView, CommitVitalsView

urlpatterns = [
    path("queue/", NurseQueueView.as_view()),
    path("update/<int:pk>/", UpdateTaskStatusView.as_view()),
    path("visit/<int:visit_id>/vitals/", NurseVisitVitalsView.as_view()),
    path("commit-notes/", CommitNotesView.as_view()),
    path("commit-vitals/", CommitVitalsView.as_view()),
]