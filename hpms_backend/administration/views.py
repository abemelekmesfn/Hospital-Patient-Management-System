from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from users.models import User
from triage.models import Visit, Triage
from billing.models import BillingCharge, Invoice, PharmacySale
from billing import services as billing_services
from .models import AuditLog, InventoryItem, MAX_INVENTORY_ITEMS
from .permissions import IsAuthenticatedAdmin

from .serializers import (
    UserSerializer,
    CreateUserSerializer,
    AuditLogSerializer,
    InventoryItemSerializer,
    InventoryItemCreateSerializer,
)


def _log_action(request, message):
    AuditLog.objects.create(user=request.user, action=message)


class AdminAPIView(APIView):
    permission_classes = [IsAuthenticatedAdmin]


class DashboardStatsView(AdminAPIView):

    def get(self, request):
        total_patients = Visit.objects.count()
        total_revenue = float(billing_services.total_hospital_revenue())
        active_staff = User.objects.filter(is_active=True).count()
        emergencies = Visit.objects.filter(triage__priority="CRITICAL").count()

        return Response(
            {
                "total_patients": total_patients,
                "revenue": total_revenue,
                "active_staff": active_staff,
                "emergencies": emergencies,
            }
        )


class UserListView(AdminAPIView):

    def get(self, request):
        users = User.objects.all().order_by("role", "username")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class CreateUserView(AdminAPIView):

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _log_action(
            request,
            f"Created user {user.username} ({user.role})",
        )
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class ToggleUserStatusView(AdminAPIView):

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.role == "ADMIN":
            return Response(
                {"error": "Admin accounts cannot be disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        _log_action(
            request,
            f"{'Enabled' if user.is_active else 'Disabled'} user {user.username}",
        )
        return Response({"message": "User updated", "user": UserSerializer(user).data})


class AuditLogView(AdminAPIView):

    def get(self, request):
        logs = AuditLog.objects.select_related("user").order_by("-created_at")[:100]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)


class AnalyticsView(AdminAPIView):

    def get(self, request):
        visits_by_status = list(
            Visit.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        triage_by_priority = list(
            Triage.objects.values("priority")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        since = timezone.now() - timedelta(days=6)
        visits_by_day = list(
            Visit.objects.filter(arrival_time__gte=since)
            .annotate(day=TruncDate("arrival_time"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        visits_by_day = [
            {"date": row["day"].isoformat() if row["day"] else "", "count": row["count"]}
            for row in visits_by_day
        ]
        staff_by_role = list(
            User.objects.values("role")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        paid_charges = BillingCharge.objects.filter(status="PAID").aggregate(
            total=Sum("patient_amount")
        )["total"] or 0
        paid_pharma = PharmacySale.objects.filter(status="PAID").aggregate(
            total=Sum("patient_amount")
        )["total"] or 0
        pending_charges = BillingCharge.objects.filter(status="PENDING").aggregate(
            total=Sum("patient_amount")
        )["total"] or 0
        pending_pharma = PharmacySale.objects.filter(status="PENDING").aggregate(
            total=Sum("patient_amount")
        )["total"] or 0

        return Response(
            {
                "visits_by_status": visits_by_status,
                "triage_by_priority": triage_by_priority,
                "visits_by_day": visits_by_day,
                "staff_by_role": staff_by_role,
                "billing": {
                    "paid_total": float(paid_charges + paid_pharma),
                    "pending_total": float(pending_charges + pending_pharma),
                    "paid_cashier": float(paid_charges),
                    "paid_pharmacy": float(paid_pharma),
                },
            }
        )


class InventoryListCreateView(AdminAPIView):

    def get(self, request):
        items = InventoryItem.objects.all()
        serialized = InventoryItemSerializer(items, many=True).data
        by_category = {}
        for row in serialized:
            cat = row["category"]
            by_category.setdefault(cat, []).append(row)

        return Response(
            {
                "items": serialized,
                "by_category": by_category,
                "total": items.count(),
                "max_items": MAX_INVENTORY_ITEMS,
                "categories": [
                    {"value": c[0], "label": c[1]}
                    for c in InventoryItem.CATEGORY_CHOICES
                ],
            }
        )

    def post(self, request):
        serializer = InventoryItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        _log_action(request, f"Added inventory: {item.name} ({item.category})")
        return Response(
            InventoryItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class InventoryDetailView(AdminAPIView):

    def patch(self, request, pk):
        try:
            item = InventoryItem.objects.get(pk=pk)
        except InventoryItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        serializer = InventoryItemSerializer(
            item, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        _log_action(request, f"Updated inventory: {item.name} (qty {item.quantity})")
        return Response(InventoryItemSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = InventoryItem.objects.get(pk=pk)
        except InventoryItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        name = item.name
        item.delete()
        _log_action(request, f"Removed inventory: {name}")
        return Response(status=status.HTTP_204_NO_CONTENT)
