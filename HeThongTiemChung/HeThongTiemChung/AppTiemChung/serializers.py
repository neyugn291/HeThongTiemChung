from rest_framework.serializers import ModelSerializer
from .models import Vaccine
class VaccineSerializer(ModelSerializer):
    class Meta:
        model = Vaccine
        fields = ['id', 'name']