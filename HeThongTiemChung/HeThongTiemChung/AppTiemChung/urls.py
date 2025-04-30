from django.urls import path, include
from . import views
from rest_framework import routers

urlpatterns = [
    path('', views.index, name="index")
]

router = routers.DefaultRouter()
router.register(r'vaccines', views.VaccineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]


