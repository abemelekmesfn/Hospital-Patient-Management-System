from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = "Activate every staff account (admin is always kept active)."

    def handle(self, *args, **options):
        updated = User.objects.filter(is_active=False).update(is_active=True)
        User.objects.filter(role="ADMIN").update(is_active=True)
        self.stdout.write(
            self.style.SUCCESS(f"Activated {updated} inactive account(s).")
        )
        for u in User.objects.all().order_by("username"):
            self.stdout.write(f"  {u.username} ({u.role}) active={u.is_active}")
