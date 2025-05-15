from django.http import HttpResponse


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

class AppointmentViewSet(viewsets.ModelViewSet):
    serializers_class = serializers.AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    @action(detail=True, methods=['get'])
    def reminders(self, request, pk=None):
        # GET /appointments/{id}/reminders/
        appointment = Appointment.objects.get(pk=pk, user=request.user)
        # Gửi email hoặc push notification ở đây
        return Response({"message": "Reminder sent!"})




class AppointmentAdminViewSet(viewsets.ViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [permissions.IsAdminUser]

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


class InjectionScheduleViewSet(viewsets.ViewSet):
    """
    API cho việc quản lý lịch tiêm.
    Người dùng phải là admin mới có thể truy cập.
    """
    queryset = InjectionSchedule.objects.all()  # Lấy tất cả lịch tiêm
    serializer_class = InjectionScheduleSerializer  # Serializer để chuyển đổi dữ liệu thành JSON
    permission_classes = [IsAdminUser]  # Chỉ admin mới có quyền truy cập

    def get_permissions(self):
        """
        Thiết lập quyền truy cập tùy theo action.
        """
        if self.action in ['create', 'update', 'destroy']:
            return [permissions.IsAdminUser()]  # Chỉ admin mới có quyền thực hiện các hành động này
        return [permissions.IsAuthenticated()]  # Người dùng xác thực có thể xem lịch tiêm

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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def all_schedules(self, request):
        """
        API cho tất cả người dùng xem tất cả lịch tiêm (bao gồm lịch tiêm trong quá khứ và sắp tới).
        """
        view_past = request.query_params.get('view_past', 'false')  # Lấy tham số query view_past

        if view_past.lower() == 'true':
            # Lấy tất cả lịch tiêm bao gồm cả đã diễn ra và sắp tới
            all_schedules = InjectionSchedule.objects.all()
        else:
            # Chỉ lấy lịch tiêm sắp tới
            all_schedules = InjectionSchedule.objects.filter(date__gte=datetime.date.today())

        serializer = InjectionScheduleSerializer(all_schedules, many=True)
        return Response(serializer.data)

    def create(self, request):
        """
        Tạo mới lịch tiêm.
        """
        serializer = InjectionScheduleSerializer(data=request.data)

        if serializer.is_valid():
            # Lưu lịch tiêm mới vào cơ sở dữ liệu
            schedule = serializer.save()

            return Response(InjectionScheduleSerializer(schedule).data, status=201)  # Trả về dữ liệu đã tạo
        else:
            return Response(serializer.errors, status=400)  # Trả về lỗi nếu dữ liệu không hợp lệ

class InjectionSiteViewSet(viewsets.ModelViewSet):
    queryset = InjectionSite.objects.all()
    serializer_class = InjectionSiteSerializer
    permission_classes = [IsAdminUser]