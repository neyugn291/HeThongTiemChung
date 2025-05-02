from django.urls import path, include
from rest_framework import routers

from . import views

urlpatterns = [
    path('', views.index, name="index")
]

router = routers.DefaultRouter()
router.register('vaccines', views.VaccineViewSet)
router.register('users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls))
]
