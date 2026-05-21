from django.urls import path
from .views import LabQueueView, LabResultUpdateView, LabVisitSubmitView

urlpatterns = [
    path("queue/", LabQueueView.as_view()),
    path("result/<int:pk>/", LabResultUpdateView.as_view()),
    path("visit/<int:visit_id>/submit/", LabVisitSubmitView.as_view()),
]