from django.shortcuts import render
from django.http import HttpResponse

def index(request):
    return HttpResponse("Vaccination App")

from rest_framework import viewsets, permissions, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Vaccine, User, Appointment
from .serializers import AppointmentSerializer

from django.contrib.auth.hashers import make_password
from AppTiemChung import serializers

class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.filter(active=True)
    serializer_class = serializers.VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]

# class AppointmentViewSet(viewsets.ModelViewSet):
#     serializer_class = serializers.AppointmentSerializer
#
#     def get_queryset(self):
#         # chỉ cho phép xem lịch hẹn của chính mình
#         return Appointment.objects.filter(user=self.request.user)
#
#     def perform_create(self, serializer):
#         # gán user hiện tại khi tạo lịch hẹn
#         serializer.save(user=self.request.user)

class AppointmentViewSet(viewsets.ViewSet):
    def list(self, request):
        # GET /appointments/
        appointments = Appointment.objects.filter(user=request.user)
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def reminders(self, request, pk=None):
        # GET /appointments/{id}/reminders/
        appointment = Appointment.objects.get(pk=pk, user=request.user)
        # Gửi email hoặc push notification ở đây
        return Response({"message": "Reminder sent!"})


        # AppointmentViewSet - cho nhân viên y tế
class AppointmentAdminViewSet(viewsets.ViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.all()  # Nhân viên y tế có thể xem tất cả lịch hẹn

    def perform_create(self, serializer):
        # Gán nhân viên y tế khi tạo lịch hẹn
        serializer.save()

    def get_object(self, pk):
        try:
            return Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            raise Http404

    @action(methods=['put'], detail=True)
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = request.data.get('status')
        appointment.save()
        return Response({"message": "Status updated successfully"})

    @action(methods=['put'], detail=True)
    def add_health_note(self, request, pk=None):
        appointment = self.get_object()
        appointment.health_note = request.data.get('health_note')
        appointment.save()
        return Response({"message": "Health note added successfully"})

    @action(methods=['get'], detail=True)
    def history(self, request, pk=None):
        # Lấy lịch sử tiêm của người dân
        user_appointments = Appointment.objects.filter(user=pk)
        return Response(serializers.AppointmentSerializer(user_appointments, many=True).data)

class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    parser_classes = [parsers.MultiPartParser]

    def get_permissions(self):
        if self.action in ['current_user', 'update_user_info']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get'], url_path='current-user', detail=False)
    def current_user(self, request):
        return Response(serializers.UserSerializer(request.user).data)

