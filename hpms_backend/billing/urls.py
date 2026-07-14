from django.urls import path

from .views import (
    BillingQueueView,
    CashierQueueView,
    HospitalServiceDetailView,
    HospitalServiceListCreateView,
    InvoiceDetailView,
    PayChargesView,
    PayVisitBulkView,
    ProcessPaymentView,
    ReceiptDetailView,
    TotalVisitReceiptView,
    VisitChargesView,
)
from .insurance_views import InsuranceClaimListView, InsuranceClaimVerifyView

urlpatterns = [
    path("queue/", CashierQueueView.as_view()),
    path("visit/<int:visit_id>/charges/", VisitChargesView.as_view()),
    path("visit/<int:visit_id>/total-receipt/", TotalVisitReceiptView.as_view()),
    path("pay/", PayChargesView.as_view()),
    path("pay-visit/<int:visit_id>/", PayVisitBulkView.as_view()),
    path("receipt/<str:receipt_number>/", ReceiptDetailView.as_view()),
    path("services/", HospitalServiceListCreateView.as_view()),
    path("services/<int:pk>/", HospitalServiceDetailView.as_view()),
    # Insurance claims
    path("insurance-claims/", InsuranceClaimListView.as_view()),
    path("insurance-claims/<int:pk>/verify/", InsuranceClaimVerifyView.as_view()),
    # Legacy
    path("invoice/<int:pk>/", InvoiceDetailView.as_view()),
    path("pay/<int:pk>/", ProcessPaymentView.as_view()),
]
