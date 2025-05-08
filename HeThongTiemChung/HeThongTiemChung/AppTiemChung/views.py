from django.shortcuts import render
from django.http import HttpResponse

def index(request):
    return HttpResponse("Vaccination App")

from rest_framework import viewsets, permissions, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Vaccine, User, Appointment, VaccinationRecord
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

    @action(methods=['get'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def history(self, request):
        """
        Lấy lịch sử cuộc hẹn của người dùng hiện tại
        """
        user = request.user
        user_appointments = Appointment.objects.filter(user=user)
        serialized = AppointmentSerializer(user_appointments, many=True)
        return Response(serialized.data)

    def create(self, request, *args, **kwargs):
        """
        Xử lý yêu cầu POST để đăng ký người dùng mới
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Mã hóa mật khẩu trước khi lưu
            serializer.validated_data['password'] = make_password(serializer.validated_data['password'])
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response({"message": "Đăng ký thành công"}, status=status.HTTP_201_CREATED, headers=headers)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get', 'patch'], url_path='current-user', detail=False, permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        """
        Lấy hoặc cập nhật thông tin người dùng hiện tại
        """
        u = request.user
        if request.method.__eq__('PATCH'):
            for k, v in request.data.items():
                if k in ['first_name', 'last_name']:
                    setattr(u, k, v)
                elif k.__eq__('password'):
                    u.set_password(v)
            u.save()

        return Response(serializers.UserSerializer(u).data)

import io
from django.http import FileResponse
from reportlab.pdfgen import canvas
from datetime import datetime

class VaccinationRecordViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='history')
    def vaccination_history(self, request):
        records = VaccinationRecord.objects.filter(user=request.user).select_related('vaccine', 'site')
        data = serializers.VaccinationRecordSerializer(records, many=True).data
        return Response(data)



    @action(detail=False, methods=['get'], url_path='certificate')
    def download_certificate(self, request):
        records = VaccinationRecord.objects.filter(user=request.user)
        if not records.exists():
            return Response({'message': 'No vaccination records found'}, status=404)

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)

        p.setFont("Helvetica-Bold", 16)
        p.drawString(200, 800, "Vaccination Certificate")

        p.setFont("Helvetica", 12)
        p.drawString(50, 770, f"Name: {request.user.get_full_name()}")
        p.drawString(50, 755, f"Citizen ID: {request.user.citizen_id}")
        p.drawString(50, 740, f"Issue Date: {datetime.today().strftime('%Y-%m-%d')}")

        y = 710
        for record in records:
            p.drawString(50, y, f"- {record.vaccine.name}, Dose {record.dose_number}, Date: {record.injection_date}")
            y -= 20

        p.showPage()
        p.save()
        buffer.seek(0)

        return FileResponse(buffer, as_attachment=True, filename='vaccination_certificate.pdf')


