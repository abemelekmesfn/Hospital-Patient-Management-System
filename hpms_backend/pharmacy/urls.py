from django.urls import path
from .views import (
    PharmacyQueueView,
    DispenseDrugView,
    PharmacistPrescriptionPatchView,
)

urlpatterns = [
    path("queue/", PharmacyQueueView.as_view()),
    path("dispense/<int:pk>/", DispenseDrugView.as_view()),
    path("prescription/<int:pk>/", PharmacistPrescriptionPatchView.as_view()),
]