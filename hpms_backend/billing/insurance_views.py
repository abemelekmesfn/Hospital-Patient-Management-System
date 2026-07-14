from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.permissions import IsAuthenticatedAdmin
from .models import InsuranceClaim
from .serializers import InsuranceClaimSerializer


class InsuranceClaimListView(APIView):
    """List all insurance claims with optional status filter."""
    permission_classes = [IsAuthenticatedAdmin]

    def get(self, request):
        qs = InsuranceClaim.objects.select_related(
            "charge__visit__patient", "verified_by"
        ).all()
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = InsuranceClaimSerializer(qs, many=True)
        return Response(serializer.data)


class InsuranceClaimVerifyView(APIView):
    """Verify or reject an insurance claim."""
    permission_classes = [IsAuthenticatedAdmin]

    def post(self, request, pk):
        try:
            claim = InsuranceClaim.objects.select_related(
                "charge__visit__patient"
            ).get(pk=pk)
        except InsuranceClaim.DoesNotExist:
            return Response(
                {"detail": "Claim not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        if new_status not in ("VERIFIED", "REJECTED", "SUBMITTED"):
            return Response(
                {"detail": "status must be VERIFIED, REJECTED, or SUBMITTED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        claim.status = new_status
        claim.reference_number = request.data.get("reference_number", claim.reference_number)
        claim.notes = request.data.get("notes", claim.notes)
        claim.insurance_company = request.data.get("insurance_company", claim.insurance_company)

        if new_status in ("VERIFIED", "REJECTED"):
            claim.verified_by = request.user
            claim.verified_at = timezone.now()

        claim.save()
        return Response(InsuranceClaimSerializer(claim).data)
