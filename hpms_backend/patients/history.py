from triage.models import Visit


def _doctor_display(user):
    if not user:
        return ""
    first = (getattr(user, "first_name", "") or "").strip()
    last = (getattr(user, "last_name", "") or "").strip()
    name = f"{first} {last}".strip()
    return name or getattr(user, "username", "") or ""


def _triage_block(visit):
    triage = getattr(visit, "triage", None)
    if not triage:
        return None
    return {
        "priority": triage.priority,
        "chief_complaint": triage.chief_complaint or "",
        "temperature": triage.temperature,
        "blood_pressure": triage.blood_pressure or "",
        "pulse": triage.pulse,
        "respiratory_rate": triage.respiratory_rate,
        "triage_patient_name": triage.triage_patient_name or "",
        "recorded_at": triage.created_at,
    }


def _reception_block(visit):
    kin = visit.next_of_kin.first() if hasattr(visit, "next_of_kin") else None
    return {
        "registration_number": visit.registration_number,
        "arrival_mode": visit.arrival_mode,
        "arrival_time": visit.arrival_time,
        "status": visit.status,
        "kin_name": kin.name if kin else "",
        "kin_phone": kin.phone if kin else "",
        "kin_relationship": kin.relationship if kin else "",
    }


def _consultation_block(visit):
    consultation = getattr(visit, "consultation", None)
    if not consultation:
        return None
    doctor = consultation.doctor or visit.doctor
    return {
        "doctor_name": _doctor_display(doctor),
        "chief_complaint": consultation.chief_complaint or "",
        "physical_exam": consultation.physical_exam or "",
        "diagnosis": consultation.diagnosis or "",
        "examined_at": consultation.updated_at or consultation.created_at,
    }


def _invoice_block(visit):
    invoice = getattr(visit, "invoice", None)
    if not invoice:
        return None
    items = [
        {
            "service_name": item.service_name,
            "department": item.department,
            "cost": str(item.cost),
        }
        for item in invoice.items.all()
    ]
    return {
        "id": invoice.id,
        "subtotal": invoice.subtotal,
        "insurance_discount": invoice.insurance_discount,
        "total": invoice.total,
        "status": invoice.status,
        "payment_method": invoice.payment_method,
        "created_at": invoice.created_at,
        "items": items,
    }


def get_patient_visits_queryset(patient):
    return (
        Visit.objects.filter(patient=patient)
        .select_related("triage", "doctor", "consultation", "consultation__doctor")
        .prefetch_related(
            "prescriptions",
            "lab_orders",
            "nurse_tasks",
            "next_of_kin",
            "invoice",
            "invoice__items",
        )
        .order_by("-arrival_time")
    )


def build_clinical_history(patient):
    visits_data = []
    for visit in get_patient_visits_queryset(patient):
        doctor = visit.doctor
        if not doctor and hasattr(visit, "consultation"):
            doctor = getattr(visit.consultation, "doctor", None)

        visits_data.append(
            {
                "id": visit.id,
                "registration_number": visit.registration_number,
                "arrival_time": visit.arrival_time,
                "status": visit.status,
                "doctor_name": _doctor_display(doctor),
                "triage": _triage_block(visit),
                "reception": _reception_block(visit),
                "consultation": _consultation_block(visit),
                "lab_orders": [
                    {
                        "test_name": lo.test_name,
                        "status": lo.status,
                        "result": lo.result or "",
                        "ordered_at": lo.created_at,
                        "completed_at": lo.completed_at,
                    }
                    for lo in visit.lab_orders.all()
                ],
                "prescriptions": [
                    {
                        "drug_name": rx.drug_name,
                        "dosage": rx.dosage,
                        "frequency": rx.frequency,
                        "duration": rx.duration,
                        "pharmacy_status": rx.pharmacy_status,
                        "prescribed_at": rx.created_at,
                    }
                    for rx in visit.prescriptions.all()
                ],
                "nurse_tasks": [
                    {
                        "task_description": t.task_description,
                        "status": t.status,
                        "created_at": t.created_at,
                    }
                    for t in visit.nurse_tasks.all()
                ],
            }
        )
    return visits_data


def build_admin_history(patient):
    visits_data = []
    for visit in get_patient_visits_queryset(patient):
        doctor = visit.doctor
        if not doctor and hasattr(visit, "consultation"):
            doctor = getattr(visit.consultation, "doctor", None)

        visits_data.append(
            {
                "id": visit.id,
                "registration_number": visit.registration_number,
                "arrival_time": visit.arrival_time,
                "status": visit.status,
                "doctor_name": _doctor_display(doctor),
                "reception": _reception_block(visit),
                "invoice": _invoice_block(visit),
            }
        )
    return visits_data
