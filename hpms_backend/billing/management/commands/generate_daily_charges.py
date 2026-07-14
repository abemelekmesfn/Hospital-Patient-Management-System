from django.core.management.base import BaseCommand
from django.utils import timezone
from doctor.models import Admission
from billing.models import BillingCharge

class Command(BaseCommand):
    help = 'Generate daily charges for admitted patients'

    def handle(self, *args, **options):
        # Find all current admissions (not discharged)
        admissions = Admission.objects.filter(discharged_at__isnull=True)
        count = 0
        for admission in admissions:
            # Check if charge already created today to avoid duplicates
            today = timezone.now().date()
            existing_charge = BillingCharge.objects.filter(
                visit=admission.visit,
                item_name=f"Daily Bed Charge - {admission.ward.name} ({admission.bed.bed_number})",
                created_at__date=today
            ).exists()
            
            if not existing_charge:
                # Get the daily rate based on ward type. For now, flat rate or could use Ward model
                # Assuming generic flat rate 50.00 for normal, 100 for ICU etc
                amount = 100.00 if "ICU" in admission.ward.name.upper() else 50.00
                
                # Check for DEBT exemption
                is_debt = admission.visit.patient.billing_exempt == 'DEBT'
                status = "PENDING"
                # If they are DEBT, it is still pending until discharge, but it's recorded on the visit
                # Actually, DEBT implies deferred payment, so it sits as pending.

                BillingCharge.objects.create(
                    visit=admission.visit,
                    item_type="ADMISSION",
                    item_name=f"Daily Bed Charge - {admission.ward.name} ({admission.bed.bed_number})",
                    quantity=1,
                    unit_price=amount,
                    patient_amount=amount,
                    insurance_amount=0,
                    status=status
                )
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully generated {count} daily charges for admitted patients.'))
