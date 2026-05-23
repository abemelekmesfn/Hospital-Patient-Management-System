from django.urls import path
from .views import (
    PharmacyQueueView,
    DispenseDrugView,
    PharmacistPrescriptionPatchView,
    PrescriptionQuoteView,
)

urlpatterns = [
    path("queue/", PharmacyQueueView.as_view()),
    path("quote/<int:pk>/", PrescriptionQuoteView.as_view()),
    path("dispense/<int:pk>/", DispenseDrugView.as_view()),
    path("prescription/<int:pk>/", PharmacistPrescriptionPatchView.as_view()),
]