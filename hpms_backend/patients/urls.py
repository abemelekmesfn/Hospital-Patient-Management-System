from django.urls import path
from .views import (
    search_patient,
    quick_add_patient,
    patient_detail,
    patient_autofill,
    patient_clinical_history,
    patient_admin_history,
)

urlpatterns = [
    path("search/", search_patient),
    path("quick-add/", quick_add_patient),
    path("<int:pk>/history/", patient_clinical_history),
    path("<int:pk>/history/admin/", patient_admin_history),
    path("<int:pk>/autofill/", patient_autofill),
    path("<int:pk>/", patient_detail),
]
