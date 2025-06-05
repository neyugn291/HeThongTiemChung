from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('vaccines', views.VaccineViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'vaccine-types', views.VaccineTypeViewSet, basename='vaccine-type')
router.register('users', views.UserViewSet, basename='register')
router.register('appointment', views.AppointmentViewSet, basename='appointment')
router.register('appointments', views.AppointmentAdminViewSet, basename='appointments')
router.register('records', views.VaccinationRecordViewSet, basename='records')
router.register(r'schedules', views.InjectionScheduleViewSet, basename='injectionschedule')
router.register(r'sites', views.InjectionSiteViewSet, basename='injectionsite')
router.register(r'chat-messages', views.ChatMessageViewSet, basename='chat-message')

urlpatterns = [
    path('', include(router.urls)),  # Bao gồm tất cả các URL từ router
    path('', views.index, name="index"),  # URL gốc trỏ tới index (nếu cần)
    path('chat/', views.chat_view, name='chat'),
    path('stats/', views.StatsAPIView.as_view(), name='stats-api'),
    path('ai-chat/', views.ai_chat, name='ai-chat'),
    path('check-question/', views.check_question, name='check-question'),
]
