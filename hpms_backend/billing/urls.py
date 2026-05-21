from django.urls import path
from .views import (
    BillingQueueView,
    InvoiceDetailView,
    ProcessPaymentView
)

urlpatterns = [
    path("queue/", BillingQueueView.as_view()),
    path("invoice/<int:pk>/", InvoiceDetailView.as_view()),
    path("pay/<int:pk>/", ProcessPaymentView.as_view()),
]