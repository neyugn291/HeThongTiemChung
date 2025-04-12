from django.shortcuts import render

# Create your views here.

from django.http import HttpResponse
def index(request):
    return HttpResponse("Vaccination App")

from rest_framework import viewsets, permissions
from .models import Vaccine
from .serializers import VaccineSerializer
class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.filter(active=True)
    serializer_class = VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]



