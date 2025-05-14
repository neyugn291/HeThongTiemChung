from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings



def index(request):
    return HttpResponse("Vaccination App")


from rest_framework import viewsets, permissions, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Vaccine, User, Appointment, VaccinationRecord, InjectionSchedule, InjectionSite
from .serializers import AppointmentSerializer, InjectionScheduleSerializer,InjectionSiteSerializer
from .permissions import IsAdminUser, IsStaffUser

from AppTiemChung import serializers


class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.all()
    serializer_class = serializers.VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Appointment.objects.filter(user=user)
        return Appointment.objects.none()

    @action(detail=True, methods=['get'])
    def reminders(self, request, pk=None):
        # GET /appointments/{id}/reminders/
        appointment = Appointment.objects.get(pk=pk, user=request.user)

        # Kiểm tra nếu cuộc hẹn đã được xác nhận
        if appointment.is_confirmed:
            # Gửi email xác nhận
            send_mail(
                'Appointment Confirmed',
                f'Your appointment on {appointment.schedule.date} at {appointment.schedule.site.name} has been confirmed.',
                settings.EMAIL_HOST_USER,
                [appointment.user.email],
                fail_silently=False,
            )
            return Response({"message": "Reminder email sent!"})
        else:
            return Response({"message": "Appointment is not confirmed yet."}, status=400)




class AppointmentAdminViewSet(viewsets.ViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [IsStaffUser]

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

    @action(methods=['get'], detail=False)
    def history(self, request):
        appointments = Appointment.objects.all()
        serializer = serializers.AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)



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

    def get_permissions(self):
        if self.action in ['current_user', 'history']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get', 'patch'], url_path='current-user', detail=False,
            permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        """
        Lấy hoặc cập nhật thông tin người dùng hiện tại
        """
        u = request.user
        if request.method.__eq__('PATCH'):
            serializer = serializers.UserSerializer(u, data=request.data, partial=True)
            if serializer.is_valid():
                validated_data = serializer.validated_data
            for k, v in request.data.items():
                if k.__eq__('password'):
                    u.set_password(v)
                elif k.__eq__('avatar'):
                    if v:
                        u.avatar = v;
                elif k.__eq__('gender'):
                    u.gender = v
                elif k.__eq__('birth_date'):
                    u.birth_date = v
                else:
                    setattr(u, k, v)
            u.save()

        return Response(serializers.UserSerializer(u).data)


import io
from django.http import FileResponse
from reportlab.pdfgen import canvas
from datetime import datetime
import datetime



class VaccinationRecordViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='history')
    def vaccination_history(self, request):
        records = VaccinationRecord.objects.filter(user=request.user).select_related('vaccine', 'site')
        data = serializers.VaccinationRecordSerializer(records, many=True).data
        return Response(data)

    @action(detail=True, methods=['get'], url_path='certificate')
    def download_single_certificate(self, request, pk=None):
        try:
            record = VaccinationRecord.objects.select_related('vaccine', 'site').get(pk=pk)
        except VaccinationRecord.DoesNotExist:
            return Response({'message': 'Vaccination record not found'}, status=404)

        # ✅ Kiểm tra người dùng có phải chủ sở hữu bản ghi không
        if record.user != request.user:
            return Response({'message': 'Permission denied'}, status=403)

        # ✅ Tạo PDF cho một bản ghi
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)

        p.setFont("Helvetica-Bold", 16)
        p.drawString(200, 800, "Vaccination Certificate")

        p.setFont("Helvetica", 12)
        p.drawString(50, 770, f"Name: {request.user.get_full_name()}")
        p.drawString(50, 755, f"Citizen ID: {request.user.citizen_id}")
        p.drawString(50, 740, f"Issue Date: {datetime.today().strftime('%Y-%m-%d')}")

        p.drawString(50, 710, f"Vaccine: {record.vaccine.name}")
        p.drawString(50, 690, f"Dose: {record.dose_number}")
        p.drawString(50, 670, f"Date: {record.injection_date}")
        p.drawString(50, 650, f"Site: {record.site.name if record.site else 'N/A'}")

        p.showPage()
        p.save()
        buffer.seek(0)


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

    @action(detail=True, methods=['put'], url_path='add-health-note')
    def add_health_note(self, request, pk=None):
        """
        API để thêm hoặc cập nhật health note vào VaccinationRecord.
        """
        try:
            record = VaccinationRecord.objects.get(pk=pk, user=request.user)
        except VaccinationRecord.DoesNotExist:
            return Response({'message': 'Vaccination record not found'}, status=status.HTTP_404_NOT_FOUND)

        # Kiểm tra xem người dùng có quyền truy cập bản ghi này không
        if record.user != request.user:
            return Response({'message': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Lấy health note từ request
        health_note = request.data.get('health_note')

        if not health_note:
            return Response({'message': 'Health note is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật health_note vào bản ghi
        record.health_note = health_note
        record.save()

        return Response({'message': 'Health note updated successfully', 'health_note': record.health_note})


class InjectionScheduleViewSet(viewsets.ModelViewSet):
    queryset = InjectionSchedule.objects.all()  # Lấy tất cả lịch tiêm
    serializer_class = InjectionScheduleSerializer  # Serializer để chuyển đổi dữ liệu thành JSON
    permissions_classes = [permissions.IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        """
        Kiểm tra xem lịch tiêm tại một địa điểm có còn chỗ trống hay không.
        """
        schedule = self.get_object()  # Lấy đối tượng InjectionSchedule theo pk
        available_slots = schedule.slot_count  # Lấy số lượng slot còn lại
        if available_slots > 0:
            return Response({"message": "Chỗ trống còn lại: {}".format(available_slots)})
        else:
            return Response({"message": "Không còn chỗ trống"}, status=404)

    @action(detail=False, methods=['get'])
    def upcoming_schedules(self, request):
        """
        Lấy tất cả lịch tiêm sắp tới.
        """
        upcoming_schedules = InjectionSchedule.objects.filter(date__gte=datetime.date.today())
        serializer = InjectionScheduleSerializer(upcoming_schedules, many=True)
        return Response(serializer.data)



class InjectionSiteViewSet(viewsets.ModelViewSet):
    queryset = InjectionSite.objects.all()
    serializer_class = InjectionSiteSerializer
    permission_classes = [IsAdminUser]