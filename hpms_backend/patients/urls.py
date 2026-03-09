from django.urls import path
from .views import search_patient, quick_add_patient, patient_detail

urlpatterns = [

    path('search/', search_patient),
    path('quick-add/', quick_add_patient),
    path('<int:pk>/', patient_detail),
]