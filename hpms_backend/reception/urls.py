from django.urls import path
from .views import reception_queue, visit_detail
from .views import finalize_registration, available_doctors

urlpatterns = [

    path("pending/", reception_queue),
    path("visit/<int:visit_id>/", visit_detail),
    path("finalize/", finalize_registration),
    path("available-doctors/", available_doctors),

]