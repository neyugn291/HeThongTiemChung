from django.urls import path, include
from rest_framework import routers

from . import views

urlpatterns = [
    path('', views.index, name="index")
]

router = routers.DefaultRouter()
router.register('vaccines', views.VaccineViewSet)
router.register('users', views.UserViewSet)
router.register('appointment', views.AppointmentViewSet, basename='appointment')
router.register('appointments', views.AppointmentAdminViewSet, basename='appointments')

urlpatterns = [
    path('', include(router.urls))
]