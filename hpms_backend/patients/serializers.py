from rest_framework import serializers
from .models import Patient
from datetime import date

class PatientSerializer(serializers.ModelSerializer):
    
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "hospital_id",
            "first_name",
            "last_name",
            "sex",
            "date_of_birth",
            "phone"
        ]
    def get_age(self, obj):

        if not obj.date_of_birth:
            return None

        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) <
            (obj.date_of_birth.month, obj.date_of_birth.day)
        )