from django.core.management.base import BaseCommand
from users.models import User

DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"


class Command(BaseCommand):
    help = "Enable the HPMS admin account and set a known login password."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=DEFAULT_USERNAME)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": "Hospital",
                "last_name": "Administrator",
                "email": "admin@hpms.local",
                "role": "ADMIN",
                "is_active": True,
                "is_staff": True,
                "is_superuser": False,
            },
        )

        user.first_name = user.first_name or "Hospital"
        user.last_name = user.last_name or "Administrator"
        user.role = "ADMIN"
        user.is_active = True
        user.is_staff = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} admin user.\n"
                f"  Username: {username}\n"
                f"  Password: {password}\n"
                f"  Role: ADMIN (cannot be disabled from the admin UI)"
            )
        )
