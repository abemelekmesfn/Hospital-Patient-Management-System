from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from triage.models import Visit, Triage

from .models import BillingCharge, HospitalService, Invoice, InvoiceItem


DEFAULT_SERVICES = [
    ("REGISTRATION", "Patient Registration", "Reception", "50.00", "REGISTRATION"),
    ("CONSULTATION", "Doctor Consultation", "Outpatient", "200.00", "CONSULTATION"),
    ("LAB_GENERAL", "Laboratory Test (General)", "Laboratory", "150.00", "LAB"),
]


def ensure_default_services():
    for code, name, dept, price, stype in DEFAULT_SERVICES:
        HospitalService.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "department": dept,
                "default_price": Decimal(price),
                "service_type": stype,
                "is_active": True,
            },
        )


def get_service(code: str) -> HospitalService | None:
    ensure_default_services()
    return HospitalService.objects.filter(code=code, is_active=True).first()


def get_lab_service(test_name: str) -> HospitalService:
    ensure_default_services()
    svc = HospitalService.objects.filter(
        code__iexact=f"LAB_{test_name[:40].upper().replace(' ', '_')}",
        is_active=True,
    ).first()
    return svc or get_service("LAB_GENERAL")


def patient_is_exempt(patient) -> bool:
    return patient.billing_exempt != "NONE"


def calculate_split(patient, gross: Decimal) -> tuple[Decimal, Decimal]:
    """Return (insurance_amount, patient_amount) for a single service gross."""
    gross = Decimal(gross)
    if patient_is_exempt(patient):
        return gross, Decimal("0")

    itype = patient.insurance_type
    if itype == "FULL":
        return gross, Decimal("0")
    if itype == "PARTIAL":
        pct = min(100, max(0, int(patient.insurance_coverage_percent or 0)))
        ins = (gross * Decimal(pct) / Decimal(100)).quantize(Decimal("0.01"))
        return ins, gross - ins
    return Decimal("0"), gross


def visit_is_emergency_deferred(visit: Visit) -> bool:
    if visit.billing_deferred:
        return True
    triage = getattr(visit, "triage", None)
    if triage and triage.priority in ("CRITICAL", "URGENT"):
        return True
    return False


def _allocate_receipt_number() -> str:
    today = timezone.now().strftime("%Y%m%d")
    prefix = f"RCP-{today}-"
    last = (
        BillingCharge.objects.filter(receipt_number__startswith=prefix)
        .aggregate(m=Max("receipt_number"))
        .get("m")
    )
    seq = 1
    if last:
        try:
            seq = int(last.rsplit("-", 1)[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def _create_charge(
    visit,
    service: HospitalService,
    *,
    stage: str,
    lab_order=None,
    status="PENDING",
):
    gross = service.default_price
    ins_amt, pat_amt = calculate_split(visit.patient, gross)
    if patient_is_exempt(visit.patient):
        status = "WAIVED"
        ins_amt, pat_amt = gross, Decimal("0")

    return BillingCharge.objects.create(
        visit=visit,
        hospital_service=service,
        service_code=service.code,
        service_name=service.name,
        department=service.department,
        gross_amount=gross,
        insurance_amount=ins_amt,
        patient_amount=pat_amt,
        stage=stage,
        status=status,
        lab_order=lab_order,
    )


def create_front_desk_charges(visit: Visit):
    """Registration + consultation after reception finalize."""
    ensure_default_services()
    reg = get_service("REGISTRATION")
    con = get_service("CONSULTATION")
    if not reg or not con:
        return

    deferred = visit_is_emergency_deferred(visit)
    stage = "DISCHARGE" if deferred else "FRONT_DESK"
    exempt = patient_is_exempt(visit.patient)

    with transaction.atomic():
        for svc in (reg, con):
            if BillingCharge.objects.filter(
                visit=visit, service_code=svc.code
            ).exists():
                continue
            _create_charge(
                visit,
                svc,
                stage=stage,
                status="WAIVED" if exempt else "PENDING",
            )

        if exempt or deferred:
            if visit.status == "WAITING_RECEPTION":
                visit.status = "WAITING_DOCTOR"
                visit.save(update_fields=["status"])
        else:
            visit.status = "WAITING_CASHIER"
            visit.save(update_fields=["status"])


def front_desk_charges_paid(visit: Visit) -> bool:
    qs = visit.billing_charges.filter(
        service_code__in=["REGISTRATION", "CONSULTATION"],
        status="PENDING",
    )
    return not qs.exists()


def on_front_desk_payment_complete(visit: Visit):
    if visit.status == "WAITING_CASHIER" and front_desk_charges_paid(visit):
        visit.status = "WAITING_DOCTOR"
        visit.save(update_fields=["status"])


def create_lab_charge(lab_order):
    visit = lab_order.visit
    svc = get_lab_service(lab_order.test_name)
    deferred = visit_is_emergency_deferred(visit)
    stage = "DISCHARGE" if deferred else "LAB"
    exempt = patient_is_exempt(visit.patient)

    if BillingCharge.objects.filter(lab_order=lab_order).exists():
        return

    _create_charge(
        visit,
        svc,
        stage=stage,
        lab_order=lab_order,
        status="WAIVED" if exempt else "PENDING",
    )


def lab_charge_is_cleared(lab_order) -> bool:
    try:
        ch = lab_order.billing_charge
    except BillingCharge.DoesNotExist:
        return True
    if ch.status in ("PAID", "WAIVED"):
        return True
    if visit_is_emergency_deferred(lab_order.visit):
        return True
    return False


def pay_charges(charge_ids, payment_method, user):
    """Mark charges paid and return receipt payload."""
    ensure_default_services()
    receipt_no = _allocate_receipt_number()
    now = timezone.now()
    charges = list(
        BillingCharge.objects.filter(id__in=charge_ids, status="PENDING").select_related(
            "visit__patient"
        )
    )
    if not charges:
        return None

    visit_ids = set()
    with transaction.atomic():
        for ch in charges:
            ch.status = "PAID"
            ch.payment_method = payment_method
            ch.receipt_number = receipt_no
            ch.paid_at = now
            ch.paid_by = user
            ch.save()
            visit_ids.add(ch.visit_id)

        for vid in visit_ids:
            visit = Visit.objects.get(pk=vid)
            on_front_desk_payment_complete(visit)
            _sync_visit_invoice(visit)

    return build_receipt_from_charges(charges, receipt_no, payment_method, now)


def pay_visit_bulk(visit_id, payment_method, user, stage=None):
    qs = BillingCharge.objects.filter(visit_id=visit_id, status="PENDING")
    if stage:
        qs = qs.filter(stage=stage)
    ids = list(qs.values_list("id", flat=True))
    if not ids:
        return None
    return pay_charges(ids, payment_method, user)


def _sync_visit_invoice(visit: Visit):
    """Keep legacy Invoice in sync for admin revenue totals."""
    paid = visit.billing_charges.filter(status="PAID")
    if not paid.exists():
        return
    subtotal = sum(c.gross_amount for c in paid)
    ins = sum(c.insurance_amount for c in paid)
    total = sum(c.patient_amount for c in paid)
    inv, _ = Invoice.objects.get_or_create(visit=visit)
    inv.subtotal = subtotal
    inv.insurance_discount = ins
    inv.total = total
    inv.status = "PAID" if not visit.billing_charges.filter(status="PENDING").exists() else "PENDING"
    inv.save()


def build_receipt_from_charges(charges, receipt_number, payment_method, paid_at):
    if not charges:
        return None
    visit = charges[0].visit
    patient = visit.patient
    lines = [
        {
            "service_name": c.service_name,
            "department": c.department,
            "gross_amount": str(c.gross_amount),
            "insurance_amount": str(c.insurance_amount),
            "patient_amount": str(c.patient_amount),
        }
        for c in charges
    ]
    subtotal = sum(c.gross_amount for c in charges)
    insurance = sum(c.insurance_amount for c in charges)
    total = sum(c.patient_amount for c in charges)
    return {
        "receipt_number": receipt_number,
        "paid_at": paid_at.isoformat(),
        "payment_method": payment_method,
        "payment_method_label": dict(BillingCharge.PAYMENT_METHODS).get(
            payment_method, payment_method
        ),
        "currency": "ETB",
        "hospital_name": "DOSE Hospital",
        "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
        "hospital_id": patient.hospital_id,
        "registration_number": visit.registration_number or "",
        "visit_id": visit.id,
        "lines": lines,
        "subtotal": str(subtotal),
        "insurance_total": str(insurance),
        "total": str(total),
        "receipt_type": "SERVICE" if len(charges) == 1 else "COMBINED",
    }


def set_visit_billing_deferred_from_triage(visit: Visit):
    triage = getattr(visit, "triage", None)
    if triage and triage.priority in ("CRITICAL", "URGENT"):
        visit.billing_deferred = True
        visit.save(update_fields=["billing_deferred"])


def _match_inventory(drug_name: str):
    from administration.models import InventoryItem

    name = (drug_name or "").strip()
    if not name:
        return None, Decimal("0")
    item = (
        InventoryItem.objects.filter(category="MEDICINE", name__iexact=name).first()
        or InventoryItem.objects.filter(category="MEDICINE", name__icontains=name).first()
    )
    if item:
        return item, item.unit_price or Decimal("0")
    return None, Decimal("50.00")


def create_pharmacy_sale_for_prescription(prescription, pharmacist):
    from .models import PharmacySale, PharmacySaleLine

    if hasattr(prescription, "pharmacy_sale") and prescription.pharmacy_sale_id:
        return prescription.pharmacy_sale

    visit = prescription.visit
    item, unit_price = _match_inventory(prescription.drug_name)
    gross = unit_price
    ins, pat = calculate_split(visit.patient, gross)
    status = "WAIVED" if patient_is_exempt(visit.patient) else "PENDING"

    sale = PharmacySale.objects.create(
        visit=visit,
        prescription=prescription,
        pharmacist=pharmacist,
        subtotal=gross,
        insurance_amount=ins,
        patient_amount=pat,
        total=pat,
        status=status,
    )
    PharmacySaleLine.objects.create(
        sale=sale,
        inventory_item=item,
        drug_name=prescription.drug_name,
        quantity=1,
        unit_price=unit_price,
        line_total=gross,
    )
    return sale


def complete_waived_pharmacy_sale(sale_id, user):
    from .models import PharmacySale

    sale = PharmacySale.objects.select_related("visit__patient", "prescription").get(
        pk=sale_id
    )
    now = timezone.now()
    with transaction.atomic():
        sale.status = "WAIVED"
        sale.paid_at = now
        sale.save()
        _decrement_pharmacy_inventory(sale)
        _mark_prescription_dispensed(sale, now)
    return {"message": "Dispensed (waived).", "currency": "ETB"}


def _decrement_pharmacy_inventory(sale):
    for line in sale.lines.select_related("inventory_item"):
        inv = line.inventory_item
        if inv and inv.quantity >= line.quantity:
            inv.quantity -= line.quantity
            inv.save(update_fields=["quantity", "updated_at"])


def _mark_prescription_dispensed(sale, now):
    if sale.prescription_id:
        from doctor.models import Prescription

        rx = sale.prescription
        rx.pharmacy_status = "DISPENSED"
        rx.dispensed_at = now
        rx.save(update_fields=["pharmacy_status", "dispensed_at"])


def pay_pharmacy_sale(sale_id, payment_method, user):
    from .models import PharmacySale

    sale = PharmacySale.objects.select_related("visit__patient").get(pk=sale_id)
    if sale.status != "PENDING":
        return None
    receipt_no = _allocate_receipt_number()
    now = timezone.now()
    with transaction.atomic():
        sale.status = "PAID"
        sale.payment_method = payment_method
        sale.receipt_number = receipt_no
        sale.paid_at = now
        sale.save()
        _decrement_pharmacy_inventory(sale)
        _mark_prescription_dispensed(sale, now)

    visit = sale.visit
    patient = visit.patient if visit else None
    lines = [
        {
            "service_name": ln.drug_name,
            "department": "Pharmacy",
            "gross_amount": str(ln.line_total),
            "insurance_amount": "0",
            "patient_amount": str(ln.line_total),
        }
        for ln in sale.lines.all()
    ]
    return {
        "receipt_number": receipt_no,
        "paid_at": now.isoformat(),
        "payment_method": payment_method,
        "payment_method_label": dict(BillingCharge.PAYMENT_METHODS).get(
            payment_method, payment_method
        ),
        "currency": "ETB",
        "hospital_name": "DOSE Hospital",
        "patient_name": (
            f"{patient.first_name} {patient.last_name}".strip() if patient else "Walk-in"
        ),
        "hospital_id": patient.hospital_id if patient else "",
        "registration_number": visit.registration_number if visit else "",
        "visit_id": visit.id if visit else None,
        "lines": lines,
        "subtotal": str(sale.subtotal),
        "insurance_total": str(sale.insurance_amount),
        "total": str(sale.patient_amount),
        "receipt_type": "PHARMACY",
    }


def total_hospital_revenue():
    from .models import PharmacySale

    cashier = BillingCharge.objects.filter(status="PAID").aggregate(
        patient=Sum("patient_amount"),
        insurance=Sum("insurance_amount"),
    )
    pharma = PharmacySale.objects.filter(status="PAID").aggregate(
        patient=Sum("patient_amount"),
        insurance=Sum("insurance_amount"),
    )
    p = (cashier.get("patient") or 0) + (pharma.get("patient") or 0)
    i = (cashier.get("insurance") or 0) + (pharma.get("insurance") or 0)
    return p + i
