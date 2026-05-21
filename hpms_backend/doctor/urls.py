from django.urls import path
from .views import (
    doctor_queue,
    doctor_visit,
    save_consultation,
    create_nurse_task,
    create_prescription,
    create_lab_order,
    claim_patient,
    complete_encounter,
    delete_lab_order,
    delete_prescription,
    delete_nurse_task,
    pending_lab_notifications,
    dismiss_lab_notification,
    acknowledge_lab_results,
)

urlpatterns = [
    path("queue/", doctor_queue),
    path("visit/<int:visit_id>/", doctor_visit),
    path("consultation/", save_consultation),
    path("nurse-task/<int:task_id>/", delete_nurse_task),
    path("nurse-task/", create_nurse_task),
    path("prescription/<int:prescription_id>/", delete_prescription),
    path("prescription/", create_prescription),
    path("lab-order/<int:order_id>/", delete_lab_order),
    path("lab-order/", create_lab_order),
    path("claim_patient/<int:visit_id>/", claim_patient),
    path("complete-encounter/", complete_encounter),
    path("lab-notifications/", pending_lab_notifications),
    path("lab-notification/<int:order_id>/dismiss/", dismiss_lab_notification),
    path("lab-results/acknowledge/", acknowledge_lab_results),
]