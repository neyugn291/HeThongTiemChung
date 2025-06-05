from datetime import datetime
import hashlib
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse, FileResponse
from rest_framework import viewsets, generics, parsers, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Vaccine, User, Appointment, VaccinationRecord
from .serializers import UserSerializer
from .permissions import IsAdminUser, IsStaffUser
from AppTiemChung import models
from AppTiemChung import serializers
import io
from reportlab.pdfgen import canvas
from django.db.models import Count
from django.utils import timezone
import os
from django.core.cache import cache
from pyvi import ViTokenizer
from difflib import get_close_matches
from django.db.models import Q
import firebase_admin
from firebase_admin import credentials, db
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

def index(request):
    return HttpResponse("Vaccination App")

class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.all()
    serializer_class = serializers.VaccineSerializer
    permission_classes = [IsAuthenticated]

class VaccineTypeViewSet(viewsets.ViewSet):
    serializer_class = serializers.VaccineTypeSerializer
    permission_classes = [IsAdminUser]

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
    permission_classes = [IsAuthenticated]

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
            serializer.save(user=request.user)
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
        return models.Appointment.objects.all()

    def perform_create(self, serializer):
        serializer.save()

    def get_object(self, pk):
        try:
            return models.Appointment.objects.get(pk=pk)
        except models.Appointment.DoesNotExist:
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
            permission_classes=[IsAuthenticated])
    def history(self, request):
        user = request.user
        user_appointments = models.Appointment.objects.filter(user=user)
        serialized = serializers.AppointmentSerializer(user_appointments, many=True)
        return Response(serialized.data)

    def get_permissions(self):
        if self.action in ['current_user']:
            return [IsAuthenticated]
        elif self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]

    def list(self, request):
        users = models.User.objects.all()
        serializer = serializers.UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = models.User.objects.get(pk=pk)
        except models.User.DoesNotExist:
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
        except models.User.DoesNotExist:
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
        except models.User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=['get', 'patch'], url_path='current-user', detail=False,
            permission_classes=[IsAuthenticated])
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

class VaccinationRecordViewSet(viewsets.ViewSet):
    serializer_class = serializers.VaccinationRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return models.VaccinationRecord.objects.all()

    @action(detail=False, methods=['get'])
    def history(self, request):
        if request.user.is_staff:
            records = self.get_queryset()
        else:
            records = self.get_queryset().filter(user=request.user)

        serializer = self.serializer_class(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='certificate')
    def download_single_certificate(self, request, pk=None):
        try:
            record = models.VaccinationRecord.objects.select_related('vaccine', 'site').get(pk=pk)
        except models.VaccinationRecord.DoesNotExist:
            return Response({'message': 'Vaccination record not found'}, status=404)

        if record.user != request.user:
            return Response({'message': 'Permission denied'}, status=403)

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

        return FileResponse(buffer, as_attachment=True, filename=f'vaccination_{pk}_certificate.pdf')

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
            record = models.VaccinationRecord.objects.get(pk=pk)
        except models.VaccinationRecord.DoesNotExist:
            return Response({'message': 'Vaccination record not found'}, status=status.HTTP_404_NOT_FOUND)

        health_note = request.data.get('health_note')
        if not health_note:
            return Response({'message': 'Health note is required'}, status=status.HTTP_400_BAD_REQUEST)

        record.health_note = health_note
        record.save()
        return Response({'message': 'Health note updated successfully', 'health_note': record.health_note})

class InjectionScheduleViewSet(viewsets.ViewSet):
    queryset = models.InjectionSchedule.objects.all()
    serializer_class = serializers.InjectionScheduleSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
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
        schedule = self.get_object()
        available_slots = schedule.slot_count
        if available_slots > 0:
            return Response({"message": f"Chỗ trống còn lại: {available_slots}"})
        else:
            return Response({"message": "Không còn chỗ trống"}, status=404)

    @action(detail=False, methods=['get'])
    def upcoming_schedules(self, request):
        upcoming_schedules = models.InjectionSchedule.objects.filter(date__gte=datetime.now())
        serializer = serializers.InjectionScheduleSerializer(upcoming_schedules, many=True)
        return Response(serializer.data)

class InjectionSiteViewSet(viewsets.ModelViewSet):
    queryset = models.InjectionSite.objects.all()
    serializer_class = serializers.InjectionSiteSerializer
    permission_classes = [IsAdminUser]

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
key_path = os.path.join(base_dir, 'HeThongTiemChung', 'secure_keys', 'serviceAccountKey.json')

if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://vaccinationapp-cb597-default-rtdb.firebaseio.com'
    })

@csrf_exempt
@login_required
def send_message(request):
    if request.method == 'POST':
        try:
            data = request.POST
            message_text = data.get('message')
            user = request.user

            # Lưu tin nhắn vào Firebase
            ref = db.reference('chats').child(user.id).push()
            ref.set({
                'text': message_text,
                'sender': user.username,
                'timestamp': db.ServerValue.TIMESTAMP,
                'is_user': True
            })

            # Gửi thông báo đến nhân viên (có thể cải tiến bằng Cloud Messaging)
            staff_ref = db.reference('staff_chats')
            staff_ref.push({
                'user_id': user.id,
                'user_name': user.username,
                'last_message': message_text,
                'timestamp': db.ServerValue.TIMESTAMP
            })

            return JsonResponse({'success': True, 'message': 'Tin nhắn đã được gửi'})
        except Exception as e:
            return JsonResponse({'success': False, 'detail': str(e)})
    return JsonResponse({'success': False, 'detail': 'Phương thức không hợp lệ'})

@csrf_exempt
@login_required
def get_staff_chats(request):
    if request.method == 'GET':
        try:
            staff_ref = db.reference('staff_chats').order_by_child('timestamp')
            chats = staff_ref.get()
            if chats:
                chat_list = [
                    {
                        'user_id': key,
                        'user_name': value['user_name'],
                        'last_message': value['last_message'],
                        'timestamp': value['timestamp']
                    }
                    for key, value in chats.items()
                ]
                return JsonResponse({'success': True, 'chats': chat_list})
            return JsonResponse({'success': True, 'chats': []})
        except Exception as e:
            return JsonResponse({'success': False, 'detail': str(e)})

# Danh sách các chức năng của ứng dụng và màn hình tương ứng
APP_FUNCTIONS = {
    "đặt lịch hẹn": {
        "keywords": ["đặt lịch tiêm", "đặt lịch", "lịch hẹn"],
        "screen": "BookingAppointment",
        "message": "Để đặt lịch tiêm, bạn có thể sử dụng chức năng Đặt lịch hẹn."
    },
    "tra cứu lịch sử tiêm": {
        "keywords": ["lịch sử tiêm", "lịch sử", "lịch đã tiêm"],
        "screen": "RecordSearch",
        "message": "Để xem lịch sử tiêm, bạn có thể sử dụng chức năng Tra cứu lịch sử tiêm."
    },
    "tra cứu lịch tiêm": {
        "keywords": ["thông tin lịch tiêm", "tra cứu lịch tiêm", "tìm lịch tiêm"],
        "screen": "InjectionSearch",
        "message": "Để xem thông tin lịch tiêm, bạn có thể sử dụng chức năng Tra cứu lịch tiêm."
    },
    "tải giấy chứng nhận": {
        "keywords": ["giấy chứng nhận", "chứng nhận tiêm", "tải về chứng nhận"],
        "screen": "DownloadCertificate",
        "message": "Để xem và tải về giấy chứng nhận, bạn có thể sử dụng chức năng Tải giấy chứng nhận."
    },
    "nhắc lịch tiêm": {
        "keywords": ["nhắc hẹn", "nhận thông báo", "nhắc email", "nhắc lịch tiêm"],
        "screen": "Reminders",
        "message": "Để bật thông báo lịch tiêm qua email, bạn có thể sử dụng chức năng Nhắc lịch tiêm."
    }
}

# Hàm hỗ trợ: Logic xử lý AI
def generate_response(message):
    message = message.lower().strip()

    # Kiểm tra cache
    cache_key = f"faq_response_{hashlib.md5(message.encode('utf-8')).hexdigest()}"
    cached_response = cache.get(cache_key)
    if cached_response:
        return cached_response

    try:
        # Tokenize câu hỏi
        message_tokens = ViTokenizer.tokenize(message).split()

        # Kiểm tra xem câu hỏi có liên quan đến chức năng của ứng dụng không
        for function, info in APP_FUNCTIONS.items():
            if any(keyword in message for keyword in info["keywords"]):
                return {
                    "answer": f"{info['message']} Bạn có muốn chuyển đến màn hình {function.title()} không?",
                    "navigation": info["screen"],
                    "suggestions": []  # Không cần gợi ý thêm vì đã có câu trả lời cụ thể
                }

        # Tìm FAQ khớp với từ khóa đầu hoặc cuối
        faqs = models.Faq.objects.filter(
            Q(question_keywords__icontains=message_tokens[0]) |
            Q(question_keywords__icontains=message_tokens[-1] if message_tokens else '')
        )

        best_match = None
        best_score = 0
        for faq in faqs:
            keywords = ViTokenizer.tokenize(faq.question_keywords.lower()).split()
            score = sum(1 for keyword in keywords if keyword in message_tokens)
            if score > best_score:
                best_score = score
                best_match = faq.answer

        # Lấy tất cả từ khóa từ bảng Faq
        all_keywords = [keyword for faq in models.Faq.objects.all() for keyword in
                        ViTokenizer.tokenize(faq.question_keywords.lower()).split()]

        # Tìm gợi ý từ khóa gần đúng cho từng token trong câu hỏi
        suggestions = set()
        for token in message_tokens:
            close_matches = get_close_matches(token, all_keywords, n=3, cutoff=0.5)
            suggestions.update(close_matches)

        # Nếu không có gợi ý từ khóa, tìm gợi ý câu hỏi gần đúng
        if not suggestions:
            all_questions = [faq.question_keywords.lower() for faq in models.Faq.objects.all()]
            close_questions = get_close_matches(message, all_questions, n=3, cutoff=0.5)
            suggestions.update(close_questions)

        # Nếu không tìm thấy câu trả lời chính xác
        if not best_match:
            if suggestions:
                return {
                    "message": "Xin lỗi, tôi không hiểu câu hỏi của bạn.",
                    "suggestions": list(suggestions)[:3]  # Giới hạn 3 gợi ý
                }
            else:
                return "Xin lỗi, tôi không hiểu câu hỏi của bạn. Vui lòng thử lại với câu hỏi khác."

        # Lưu vào cache
        cache.set(cache_key, best_match, timeout=3600)

        # Trả về câu trả lời và gợi ý (nếu có)
        return {
            "answer": best_match,
            "suggestions": list(suggestions)[:3] if suggestions else [],
            "navigation": None  # Không có chuyển hướng nếu là câu hỏi FAQ
        }

    except Exception as e:
        print(f"Error in generate_response: {e}")
        return "Câu hỏi không hợp lệ. Vui lòng thử lại với câu hỏi khác."

# ViewSet cho Chat Messages (giữ nguyên nhưng không sử dụng trong ai_chat_free_api)
class ChatMessageViewSet(viewsets.ViewSet):
    """ViewSet xử lý tin nhắn chat"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Lấy danh sách tin nhắn của người dùng"""
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

# API endpoint cho AI chat
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat_free_api(request):
    """Chat với AI trả lời trực tiếp trong giao diện"""
    message = request.data.get('message')
    if not message:
        return Response({
            'detail': 'Tin nhắn không được để trống'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Gọi hàm generate_response để xử lý câu hỏi
        response = generate_response(message)

        # Nếu response là một dict với "message" (chứa gợi ý), trả về gợi ý
        if isinstance(response, dict) and "message" in response:
            # Lưu câu hỏi không có câu trả lời vào UnansweredQuestion
            models.UnansweredQuestion.objects.create(
                question=message,
                user=request.user
            )
            # Lưu vào QueryLog
            models.QueryLog.objects.create(
                user=request.user,
                question=message,
                answer=response['message']
            )
            return Response({
                'message': response['message'],
                'suggestions': response['suggestions'],
                'success': False,
                'navigation': None
            }, status=status.HTTP_200_OK)

        # Nếu response là một dict với "answer" (câu trả lời và gợi ý)
        if isinstance(response, dict) and "answer" in response:
            # Lưu vào QueryLog
            models.QueryLog.objects.create(
                user=request.user,
                question=message,
                answer=response['answer']
            )
            return Response({
                'user_message': message,
                'ai_response': response['answer'],
                'suggestions': response['suggestions'],
                'navigation': response.get('navigation', None),
                'success': True
            }, status=status.HTTP_200_OK)

        # Nếu không có câu trả lời, lưu câu hỏi vào UnansweredQuestion
        if response == "Xin lỗi, tôi không hiểu câu hỏi của bạn. Vui lòng thử lại với câu hỏi khác.":
            models.UnansweredQuestion.objects.create(
                question=message,
                user=request.user
            )

        # Lưu vào QueryLog
        models.QueryLog.objects.create(
            user=request.user,
            question=message,
            answer=response
        )

        # Trả về câu hỏi và câu trả lời (không lưu vào ChatMessage)
        return Response({
            'user_message': message,
            'ai_response': response,
            'suggestions': [],
            'navigation': None,
            'success': True
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in ai_chat_free_api: {e}")
        # Lưu vào QueryLog cho trường hợp lỗi
        models.QueryLog.objects.create(
            user=request.user,
            question=message if 'message' in locals() else "Không xác định",
            answer="Câu hỏi không hợp lệ. Vui lòng thử lại với câu hỏi khác."
        )
        return Response({
            'detail': 'Câu hỏi không hợp lệ. Vui lòng thử lại với câu hỏi khác.',
            'success': False,
            'navigation': None
        }, status=status.HTTP_200_OK)

class StatsAPIView(APIView):
    def get(self, request):
        total_vaccinated = VaccinationRecord.objects.values('user').distinct().count()
        total_appointments = Appointment.objects.count()
        completed_appointments = Appointment.objects.filter(is_inoculated=True).count()
        completion_rate = (completed_appointments / total_appointments) if total_appointments > 0 else 0
        popular_vaccines_qs = VaccinationRecord.objects.values('vaccine__name') \
                                  .annotate(count=Count('id')) \
                                  .order_by('-count')[:3]
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