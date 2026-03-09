from django.urls import path
from .views import create_triage

urlpatterns = [

    path('create/', create_triage),

]