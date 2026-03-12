from django.urls import path
from .views import reception_queue, visit_detail
from .views import finalize_registration

urlpatterns = [

    path("pending/", reception_queue),
    path("visit/<int:visit_id>/", visit_detail),
    path("finalize/", finalize_registration),

]