from datetime import timedelta

from django.db.models import Count, Sum, F, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response

from users.models import User
from triage.models import Visit, Triage
from billing.models import BillingCharge, Invoice, PharmacySale
from billing import services as billing_services
from .models import AuditLog, InventoryItem, MAX_INVENTORY_ITEMS, Ward, Bed
from .permissions import IsAuthenticatedAdmin, IsAdminOrReadOnly

from .serializers import (
    UserSerializer,
    CreateUserSerializer,
    AuditLogSerializer,
    InventoryItemSerializer,
    InventoryItemCreateSerializer,
    WardSerializer,
    BedSerializer,
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

        waived_agg = BillingCharge.objects.filter(status="WAIVED").aggregate(total=Sum("gross_amount"))
        waived_total = float(waived_agg["total"] or 0)

        insurance_agg = BillingCharge.objects.filter(status="PAID").aggregate(total=Sum("insurance_amount"))
        insurance_total = float(insurance_agg["total"] or 0)

        total_beds = Bed.objects.count()
        occupied_beds = Bed.objects.filter(is_occupied=True).count()
        admitted_patients = Visit.objects.filter(is_admitted=True).count()

        return Response(
            {
                "total_patients": total_patients,
                "revenue": total_revenue,
                "active_staff": active_staff,
                "waived_total": waived_total,
                "insurance_total": insurance_total,
                "bed_occupancy": {
                    "total_beds": total_beds,
                    "occupied_beds": occupied_beds,
                    "available_beds": total_beds - occupied_beds,
                    "admitted_patients": admitted_patients,
                },
            }
        )


class UserListView(AdminAPIView):

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)

        users = User.objects.annotate(
            daily_handled=Count('doctor_visits', filter=Q(doctor_visits__created_at__gte=today_start)) + 
                          Count('tasks', filter=Q(tasks__created_at__gte=today_start)),
            weekly_handled=Count('doctor_visits', filter=Q(doctor_visits__created_at__gte=week_start)) + 
                           Count('tasks', filter=Q(tasks__created_at__gte=week_start)),
            monthly_handled=Count('doctor_visits', filter=Q(doctor_visits__created_at__gte=month_start)) + 
                            Count('tasks', filter=Q(tasks__created_at__gte=month_start)),
        ).order_by("role", "username")

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


class DeleteUserView(AdminAPIView):

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.role == "ADMIN":
            return Response(
                {"error": "Admin accounts cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = user.username
        user.delete()
        _log_action(
            request,
            f"Deleted user {username}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResetUserPasswordView(AdminAPIView):

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if user.role == "ADMIN" and request.user.id != user.id:
            return Response(
                {"detail": "Cannot reset password for another admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_password = request.data.get("password")
        if not new_password or len(new_password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        _log_action(request, f"Reset password for user {user.username}")
        return Response({"message": f"Password reset for {user.username}"})


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

        from doctor.models import Prescription, LabOrder

        visits_by_dept = list(
            Visit.objects.exclude(consultation__doctor__department="")
            .exclude(consultation__doctor__department__isnull=True)
            .values(dept=F("consultation__doctor__department"))
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        pharma_stats = list(
            Prescription.objects.values("pharmacy_status")
            .annotate(count=Count("id"))
        )

        lab_stats = list(
            LabOrder.objects.values("status")
            .annotate(count=Count("id"))
        )

        return Response(
            {
                "visits_by_status": visits_by_status,
                "triage_by_priority": triage_by_priority,
                "visits_by_day": visits_by_day,
                "staff_by_role": staff_by_role,
                "visits_by_dept": visits_by_dept,
                "pharma_stats": pharma_stats,
                "lab_stats": lab_stats,
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
                    {"value": c, "label": str(c).title()}
                    for c in InventoryItem.objects.values_list("category", flat=True).distinct() if c
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


class AdminReportsView(AdminAPIView):

    def get(self, request):
        range_key = request.query_params.get("range", "weekly")
        
        today = timezone.now().date()
        if range_key == "daily":
            since = today
            trunc_fn = TruncDate
        elif range_key == "weekly":
            since = today - timedelta(days=6)
            trunc_fn = TruncDate
        elif range_key == "monthly":
            since = today - timedelta(days=29)
            trunc_fn = TruncWeek
        elif range_key == "yearly":
            since = today - timedelta(days=364)
            trunc_fn = TruncMonth
        else:
            since = today - timedelta(days=6)
            trunc_fn = TruncDate

        from doctor.models import Consultation

        # Base querysets
        consults = Consultation.objects.filter(created_at__date__gte=since)
        diagnosed_consults = consults.exclude(diagnosis="")

        # 1. Overview Cards
        total_patients = consults.count()
        total_diagnosed = diagnosed_consults.count()
        maternal_cases = consults.filter(doctor__department="OBGYN").count()
        child_cases = consults.filter(doctor__department="PED").count()

        overview = {
            "total_patients": total_patients,
            "total_diagnosed": total_diagnosed,
            "maternal_cases": maternal_cases,
            "child_cases": child_cases,
        }

        # 2. Disease Surveillance (All diseases, cases + trends)
        top_diseases = list(
            diagnosed_consults.values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        
        disease_trends_raw = list(
            diagnosed_consults.annotate(period=trunc_fn("created_at"))
            .values("period", "diagnosis")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        disease_trends = []
        for row in disease_trends_raw:
            per = row.get("period")
            disease_trends.append({
                "period": per.isoformat() if hasattr(per, "isoformat") else str(per),
                "diagnosis": row["diagnosis"],
                "count": row["count"],
            })

        # 3. Maternal Health Report
        maternal_keywords = ["pregnancy", "maternal", "postpartum", "hemorrhage", "labor", "delivery", "obstetric", "preeclampsia", "eclampsia"]
        maternal_q = Q(doctor__department="OBGYN")
        for kw in maternal_keywords:
            maternal_q |= Q(diagnosis__icontains=kw)
            
        maternal_report = list(
            diagnosed_consults.filter(maternal_q)
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # 4. Child Health Report
        child_keywords = ["measles", "malnutrition", "diarrhea", "pediatric", "neonatal", "infant"]
        child_q = Q(doctor__department="PED")
        for kw in child_keywords:
            child_q |= Q(diagnosis__icontains=kw)
            
        child_report = list(
            diagnosed_consults.filter(child_q)
            .values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # 5. Infectious Disease Tracking
        infectious_keywords = ["malaria", "typhoid", "tb", "tuberculosis", "hiv", "pneumonia", "cholera", "measles"]
        
        infectious_q = Q()
        for kw in infectious_keywords:
            infectious_q |= Q(diagnosis__icontains=kw)
            
        infectious_consults = diagnosed_consults.filter(infectious_q)
        
        infectious_stats = list(
            infectious_consults.values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        
        infectious_trends_raw = list(
            infectious_consults.annotate(period=trunc_fn("created_at"))
            .values("period", "diagnosis")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        
        infectious_trends = []
        for row in infectious_trends_raw:
            per = row.get("period")
            infectious_trends.append({
                "period": per.isoformat() if hasattr(per, "isoformat") else str(per),
                "diagnosis": row["diagnosis"],
                "count": row["count"],
            })

        # 6. Chronic Disease Tracking
        chronic_keywords = ["hypertension", "diabetes", "asthma", "heart disease", "copd", "arthritis"]
        chronic_q = Q()
        for kw in chronic_keywords:
            chronic_q |= Q(diagnosis__icontains=kw)
            
        chronic_consults = diagnosed_consults.filter(chronic_q)
        
        chronic_stats = list(
            chronic_consults.values("diagnosis")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        
        chronic_trends_raw = list(
            chronic_consults.annotate(period=trunc_fn("created_at"))
            .values("period", "diagnosis")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        
        chronic_trends = []
        for row in chronic_trends_raw:
            per = row.get("period")
            chronic_trends.append({
                "period": per.isoformat() if hasattr(per, "isoformat") else str(per),
                "diagnosis": row["diagnosis"],
                "count": row["count"],
            })

        return Response({
            "overview": overview,
            "surveillance": {
                "top_diseases": top_diseases,
                "trends": disease_trends,
            },
            "maternal": maternal_report,
            "child": child_report,
            "infectious": {
                "stats": infectious_stats,
                "trends": infectious_trends,
            },
            "chronic": {
                "stats": chronic_stats,
                "trends": chronic_trends,
            }
        })


class WardListCreateView(generics.ListCreateAPIView):
    queryset = Ward.objects.all().prefetch_related("beds")
    serializer_class = WardSerializer
    permission_classes = [IsAdminOrReadOnly]


class WardDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [IsAdminOrReadOnly]


class BedListCreateView(generics.ListCreateAPIView):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsAdminOrReadOnly]


class BedDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer
    permission_classes = [IsAdminOrReadOnly]
