from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Invoice
from .serializers import InvoiceSerializer

class BillingQueueView(APIView):

    def get(self, request):

        invoices = Invoice.objects.filter(status="PENDING")

        serializer = InvoiceSerializer(invoices, many=True)

        return Response(serializer.data)

class InvoiceDetailView(APIView):

    def get(self, request, pk):

        invoice = Invoice.objects.get(id=pk)

        serializer = InvoiceSerializer(invoice)

        return Response(serializer.data)


class ProcessPaymentView(APIView):

    def post(self, request, pk):

        invoice = Invoice.objects.get(id=pk)

        invoice.payment_method = request.data.get("payment_method")

        invoice.status = "PAID"

        invoice.save()

        # UPDATE VISIT STATUS
        visit = invoice.visit
        visit.status = "COMPLETED"
        visit.save()

        return Response({
            "message": "Payment processed successfully"
        })
