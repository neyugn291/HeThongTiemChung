from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('vaccines', views.VaccineViewSet)
router.register('users', views.UserViewSet)
router.register('user', views.UserViewSet, basename='register')
router.register('appointment', views.AppointmentViewSet, basename='appointment')
router.register('appointments', views.AppointmentAdminViewSet, basename='appointments')

urlpatterns = [
    path('', include(router.urls)),  # Bao gồm tất cả các URL từ router
    path('', views.index, name="index"),  # URL gốc trỏ tới index (nếu cần)
]