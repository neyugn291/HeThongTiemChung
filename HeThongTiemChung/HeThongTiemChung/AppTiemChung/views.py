from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from datetime import datetime

from chatbot.views import model


def index(request):
    return HttpResponse("Vaccination App")


from rest_framework import viewsets, permissions, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Vaccine, User, Appointment, VaccinationRecord, InjectionSchedule, InjectionSite, ChatMessage
from .serializers import AppointmentSerializer, InjectionScheduleSerializer, InjectionSiteSerializer, UserSerializer, \
    ChatMessageSerializer
from .permissions import IsAdminUser, IsStaffUser

from AppTiemChung import models
from AppTiemChung import serializers
from rest_framework import permissions

from rest_framework.exceptions import NotAuthenticated

from django.shortcuts import render
from django.contrib.auth.decorators import login_required


class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.all()
    serializer_class = serializers.VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]


class VaccineTypeViewSet(viewsets.ViewSet):
    serializer_class = serializers.VaccineTypeSerializer
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        queryset = models.VaccineType.objects.all()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            vaccine_type = models.VaccineType.objects.get(pk=pk)
        except models.VaccineType.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(vaccine_type)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        try:
            vaccine_type = models.VaccineType.objects.get(pk=pk)
        except models.VaccineType.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(vaccine_type, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            vaccine_type = models.VaccineType.objects.get(pk=pk)
        except models.VaccineType.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        vaccine_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AppointmentViewSet(viewsets.ViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return models.Appointment.objects.filter(user=user)
        return models.Appointment.objects.none()

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)  # Gán người dùng hiện tại
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(appointment)
        return Response(serializer.data)

    def update(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(appointment, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)
        appointment.delete()
        return Response({'message': 'Appointment deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='toggle-reminder')
    def toggle_reminder(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=404)

        reminder_value = request.data.get('reminder_enabled')
        if reminder_value is None:
            return Response({'detail': 'Missing reminder_enabled field.'}, status=400)

        appointment.reminder_enabled = reminder_value
        appointment.save()
        return Response({'message': f'Reminder status updated to {reminder_value}.'})


class AppointmentAdminViewSet(viewsets.ViewSet):
    serializer_class = serializers.AppointmentSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return models.Appointment.objects.all()  # Nhân viên y tế có thể xem tất cả lịch hẹn

    def perform_create(self, serializer):
        # Gán nhân viên y tế khi tạo lịch hẹn
        serializer.save()

    def get_object(self, pk):
        try:
            return model.Appointment.objects.get(pk=pk)
        except model.Appointment.DoesNotExist:
            raise status.HTTP_400_BAD_REQUEST

    @action(methods=['get'], detail=False)
    def all(self, request):
        appointments = models.Appointment.objects.all()
        serializer = serializers.AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(methods=['get'], detail=False)
    def history(self, request):
        today = timezone.now().date()
        past_appointments = self.get_queryset().filter(schedule__date__lt=today)
        serializer = self.serializer_class(past_appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='mark-confirm')
    def mark_confirm(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=404)

        confirm_value = request.data.get('is_confirmed')
        if confirm_value is None:
            return Response({'detail': 'Missing is_confirmed field.'}, status=400)
        appointment.is_confirmed = confirm_value
        appointment.save()

        if confirm_value:
            send_mail(
                'Appointment Confirmed',
                f'Your appointment on {appointment.schedule.date} at {appointment.schedule.site.name} has been confirmed.',
                settings.EMAIL_HOST_USER,
                [appointment.user.email],
                fail_silently=False,
            )
        return Response({'message': f'Appointment confirmation updated to {confirm_value}.'})

    @action(detail=True, methods=['patch'], url_path='mark-inoculated')
    def mark_inoculated(self, request, pk=None):
        appointment = self.get_queryset().filter(pk=pk).first()
        if not appointment:
            return Response({'detail': 'Appointment not found.'}, status=404)

        inoculated_value = request.data.get('is_inoculated')
        if inoculated_value is None:
            return Response({'detail': 'Missing is_inoculated field.'}, status=400)

        appointment.is_inoculated = inoculated_value

        appointment.save()
        return Response({'message': f'Appointment inoculated status updated to {inoculated_value}.'})


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    parser_classes = [parsers.MultiPartParser]

    @action(methods=['get'], url_path='current-user/history', detail=False,
            permission_classes=[permissions.IsAuthenticated()])
    def history(self, request):
        """
        Lấy lịch sử cuộc hẹn của người dùng hiện tại
        """
        user = request.user
        user_appointments = model.Appointment.objects.filter(user=user)
        serialized = serializers.AppointmentSerializer(user_appointments, many=True)
        return Response(serialized.data)

    def get_permissions(self):
        if self.action in ['current_user']:
            return [permissions.IsAuthenticated]
        elif self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]  # Chỉ admin mới thao tác với người dùng khác
        return [permissions.AllowAny()]

    def list(self, request):
        users = models.User.objects.all()
        serializer = serializers.UserSerializer(users, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = models.User.objects.get(pk=pk)
        except model.User.DoesNotExist:

            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def create(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        try:

            user = models.User.objects.get(pk=pk)
        except model.User.DoesNotExist:

            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User updated successfully!"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        try:

            user = models.User.objects.get(pk=pk)
        except model.User.DoesNotExist:

            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=['get', 'patch'], url_path='current-user', detail=False, permission_classes=[permissions.IsAuthenticated()])
    def get_current_user(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({'detail': 'Bạn chưa đăng nhập'}, status=status.HTTP_401_UNAUTHORIZED)
        if request.method == 'PATCH':
            serializer = UserSerializer(u, data=request.data, partial=True)
            if serializer.is_valid():
                validated_data = serializer.validated_data
                for k, v in request.data.items():
                    if k == 'password':
                        u.set_password(v)
                    elif k == 'avatar':
                        if v:
                            u.avatar = v
                    elif k in ['gender', 'birth_date', 'citizen_id', 'phone_number', 'first_name', 'last_name']:
                        setattr(u, k, v)
                u.save()
                return Response({"message": "User updated successfully!"}, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserSerializer(u).data)


import io
from django.http import FileResponse
from reportlab.pdfgen import canvas


class VaccinationRecordViewSet(viewsets.ViewSet):
    serializer_class = serializers.VaccinationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return models.VaccinationRecord.objects.all()

    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Nếu là staff xem tất cả, còn user xem riêng mình.
        """
        if request.user.is_staff:
            # Staff xem tất cả bản ghi
            records = self.get_queryset()
        else:
            # User thường chỉ xem bản ghi của mình
            records = self.get_queryset().filter(user=request.user)

        serializer = self.serializer_class(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='certificate')
    def download_single_certificate(self, request, pk=None):
        try:
            record = models.VaccinationRecord.objects.select_related('vaccine', 'site').get(pk=pk)
        except models.VaccinationRecord.DoesNotExist:
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

        return FileResponse(buffer, as_attachment=True, filename='vaccination_{pk}_certificate.pdf')

    @action(detail=False, methods=['get'], url_path='certificate')
    def download_certificate(self, request):
        records = models.VaccinationRecord.objects.filter(user=request.user)
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
            vaccine_name = record.vaccine.name
            vaccine_type = record.vaccine.vaccine_type.name if record.vaccine.vaccine_type else "Không xác định"
            dose_number = record.dose_number
            injection_date = record.injection_date.strftime('%Y-%m-%d')

            p.drawString(50, y, f"- {vaccine_name} ({vaccine_type}), Mũi {dose_number}, Ngày: {injection_date}")
            y -= 20

        p.showPage()
        p.save()
        buffer.seek(0)

        return FileResponse(buffer, as_attachment=True, filename='vaccination_certificate.pdf')

    @action(detail=True, methods=['patch'], url_path='add-health-note')
    def add_health_note(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'message': 'Permission denied, only staff can add health note.'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            record = models.VaccinationRecord.objects.get(pk=pk, user=request.user)
        except models.VaccinationRecord.DoesNotExist:
            return Response({'message': 'Vaccination record not found'}, status=status.HTTP_404_NOT_FOUND)

        # Lấy health note từ request
        health_note = request.data.get('health_note')

        if not health_note:
            return Response({'message': 'Health note is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật health_note vào bản ghi
        record.health_note = health_note
        record.save()

        return Response({'message': 'Health note updated successfully', 'health_note': record.health_note})


class InjectionScheduleViewSet(viewsets.ViewSet):
    queryset = models.InjectionSchedule.objects.all()
    serializer_class = serializers.InjectionScheduleSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def list(self, request):
        schedules = models.InjectionSchedule.objects.all()
        serializer = self.serializer_class(schedules, many=True)

        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            schedule = models.InjectionSchedule.objects.get(pk=pk)
        except models.InjectionSchedule.DoesNotExist:
            return Response({'message': 'Schedule not found'}, status=404)
        serializer = self.serializer_class(schedule)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def update(self, request, pk=None):
        try:
            schedule = models.InjectionSchedule.objects.get(pk=pk)
        except models.InjectionSchedule.DoesNotExist:
            return Response({'message': 'Schedule not found'}, status=404)

        serializer = self.serializer_class(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def partial_update(self, request, pk=None):
        try:
            schedule = models.InjectionSchedule.objects.get(pk=pk)
        except models.InjectionSchedule.DoesNotExist:
            return Response({'message': 'Schedule not found'}, status=404)

        serializer = self.serializer_class(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def destroy(self, request, pk=None):
        try:
            schedule = models.InjectionSchedule.objects.get(pk=pk)
        except models.InjectionSchedule.DoesNotExist:
            return Response({'message': 'Schedule not found'}, status=404)

        schedule.delete()
        return Response({'message': 'Schedule deleted successfully'}, status=204)

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        """
        Kiểm tra xem lịch tiêm tại một địa điểm có còn chỗ trống hay không.
        """
        schedule = self.get_object()
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
        upcoming_schedules = models.InjectionSchedule.objects.filter(date__gte=datetime.now())
        serializer = serializers.InjectionScheduleSerializer(upcoming_schedules, many=True)
        return Response(serializer.data)


class InjectionSiteViewSet(viewsets.ModelViewSet):
    queryset = models.InjectionSite.objects.all()
    serializer_class = serializers.InjectionSiteSerializer
    permission_classes = [IsAdminUser]


def chat_view(request):
    return render(request, 'chat/chat.html', {
        'username': request.user.username
    })


import firebase_admin
from firebase_admin import credentials, db
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
import os

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
key_path = os.path.join(base_dir, 'HeThongTiemChung', 'secure_keys', 'serviceAccountKey.json')

if not firebase_admin._apps:
    cred = credentials.Certificate('secure_keys/serviceAccountKey.json')  # 🔁 Đổi đường dẫn file JSON

    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://vaccinationapp-cb597-default-rtdb.firebaseio.com'
    })

from rest_framework.decorators import api_view
import requests

ALLOWED_KEYWORDS = ["vắc-xin", "tiêm chủng", "sức khỏe", "phản ứng phụ", "vacxin", "vaccine", "y tế", "bệnh viện",
                    "thuốc"]


@api_view(['POST'])
def check_question(request):
    """Kiểm tra câu hỏi có hợp lệ không"""
    question = request.data.get("question", "").lower()
    if any(keyword in question for keyword in ALLOWED_KEYWORDS):
        return Response({"allowed": True})
    return Response({
        "allowed": False,
        "message": "Chỉ hỗ trợ câu hỏi về vắc-xin, tiêm chủng hoặc sức khỏe."
    })


class ChatMessageViewSet(viewsets.ViewSet):
    """ViewSet cho Chat Messages"""

    def list(self, request):
        """Lấy danh sách tin nhắn của user"""
        queryset = models.ChatMessage.objects.filter(
            sender=request.user
        ).order_by('timestamp')
        serializer = serializers.ChatMessageSerializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Tạo tin nhắn mới"""
        serializer = serializers.ChatMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def chat_view(request):
    """Render trang chat với WebView"""
    return render(request, 'chat.html')


@api_view(['POST'])
def ai_chat(request):
    """
    Thay vì gọi API, chúng ta sẽ trả về URL để frontend mở WebView
    """
    message = request.data.get('message')
    if not message:
        return Response({
            'detail': 'Tin nhắn không được để trống'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Lưu tin nhắn người dùng
        user_message = models.ChatMessage.objects.create(
            sender=request.user,
            text=message,
            timestamp=timezone.now(),
            is_user=True
        )
        user_serializer = serializers.ChatMessageSerializer(user_message)

        # Tạo prompt để gửi đến ChatGPT qua WebView
        formatted_prompt = f"Bạn là chuyên gia y tế về vắc-xin và tiêm chủng. Hãy trả lời câu hỏi sau bằng tiếng Việt một cách chính xác và hữu ích: {message}"

        # Tạo URL ChatGPT với prompt được encode
        import urllib.parse
        encoded_prompt = urllib.parse.quote(formatted_prompt)
        chatgpt_url = f"https://chat.openai.com/?q={encoded_prompt}"

        return Response({
            'user_message': user_serializer.data,
            'chatgpt_url': chatgpt_url,
            'use_webview': True,
            'prompt': formatted_prompt
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in ai_chat: {e}")
        return Response({
            'detail': 'Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_ai_response(request):
    """Lưu phản hồi từ AI sau khi user copy từ WebView"""
    ai_response = request.data.get('ai_response')
    user_message_id = request.data.get('user_message_id')

    if not ai_response:
        return Response({
            'detail': 'Phản hồi AI không được để trống'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Lưu phản hồi AI
        ai_message = models.ChatMessage.objects.create(
            sender=None,  # AI không có sender
            text=ai_response,
            timestamp=timezone.now(),
            is_user=False
        )
        ai_serializer = serializers.ChatMessageSerializer(ai_message)

        return Response({
            'ai_message': ai_serializer.data,
            'success': True
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error saving AI response: {e}")
        return Response({
            'detail': 'Có lỗi xảy ra khi lưu phản hồi AI.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Alternative: Sử dụng API miễn phí khác
@api_view(['POST'])
def ai_chat_free_api(request):
    """Sử dụng API miễn phí thay vì WebView"""
    message = request.data.get('message')
    if not message:
        return Response({
            'detail': 'Tin nhắn không được để trống'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Lưu tin nhắn người dùng
        user_message = models.ChatMessage.objects.create(
            sender=request.user,
            text=message,
            timestamp=timezone.now(),
            is_user=True
        )
        user_serializer = serializers.ChatMessageSerializer(user_message)

        # Gọi API miễn phí
        ai_response_text = call_free_ai_api(message)

        if not ai_response_text:
            ai_response_text = "Xin lỗi, tôi không thể trả lời câu hỏi này ngay bây giờ. Vui lòng thử lại sau hoặc sử dụng chế độ WebView."

        # Lưu phản hồi AI
        ai_message = models.ChatMessage.objects.create(
            sender=None,
            text=ai_response_text,
            timestamp=timezone.now(),
            is_user=False
        )
        ai_serializer = serializers.ChatMessageSerializer(ai_message)

        return Response({
            'user_message': user_serializer.data,
            'ai_response': ai_serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in ai_chat_free_api: {e}")
        return Response({
            'detail': 'Có lỗi xảy ra khi xử lý tin nhắn.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def call_free_ai_api(message):
    """Gọi các API AI miễn phí"""
    try:
        # Option 1: Hugging Face Inference API (miễn phí với rate limit)
        return call_huggingface_api(message)

        # Option 2: Groq (miễn phí với quota)
        # return call_groq_free_api(message)

    except Exception as e:
        print(f"Free AI API Error: {e}")
        return None


def call_huggingface_api(message):
    """Sử dụng Hugging Face Inference API (miễn phí)"""
    import requests

    # API endpoint cho model miễn phí
    api_url = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"

    headers = {
        "Authorization": "Bearer YOUR_HUGGINGFACE_TOKEN"  # Tạo token miễn phí tại huggingface.co
    }

    payload = {
        "inputs": f"Bạn là chuyên gia y tế. Trả lời bằng tiếng Việt: {message}",
        "parameters": {
            "max_length": 200,
            "temperature": 0.7
        }
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()

        if isinstance(result, list) and len(result) > 0:
            return result[0].get('generated_text', '').replace(payload["inputs"], '').strip()

        return "Không thể tạo phản hồi từ AI."

    except Exception as e:
        print(f"Hugging Face API Error: {e}")
        return None


def call_groq_free_api(message):
    """Sử dụng Groq API (miễn phí với quota hàng ngày)"""
    import requests

    api_key = "YOUR_GROQ_API_KEY"  # Đăng ký miễn phí tại console.groq.com

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "system",
                "content": "Bạn là chuyên gia y tế về vắc-xin. Trả lời bằng tiếng Việt, chính xác và hữu ích."
            },
            {
                "role": "user",
                "content": message
            }
        ],
        "max_tokens": 300,
        "temperature": 0.7
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        return result["choices"][0]["message"]["content"]

    except Exception as e:
        print(f"Groq API Error: {e}")
        return None


from django.db.models import Count


class StatsAPIView(APIView):
    def get(self, request):
        total_vaccinated = VaccinationRecord.objects.values('user').distinct().count()

        total_appointments = Appointment.objects.count()

        completed_appointments = Appointment.objects.filter(is_inoculated=True).count()

        completion_rate = (completed_appointments / total_appointments) if total_appointments > 0 else 0

        popular_vaccines_qs = VaccinationRecord.objects.values('vaccine__name') \
                                  .annotate(count=Count('id')) \
                                  .order_by('-count')[:3]  # Lấy top 3

        popular_vaccines = [
            {"name": item['vaccine__name'], "count": item['count']}
            for item in popular_vaccines_qs
        ]

        data = {
            "total_vaccinated": total_vaccinated,
            "completion_rate": round(completion_rate * 100, 2),
            "popular_vaccines": popular_vaccines,
        }

        return Response(data)