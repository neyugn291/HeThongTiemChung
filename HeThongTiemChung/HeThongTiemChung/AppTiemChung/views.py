# Create your views here.

from django.http import HttpResponse


def index(request):
    return HttpResponse("Vaccination App")


from rest_framework import viewsets, permissions, generics, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Vaccine, User
from AppTiemChung import serializers


class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.filter(active=True)
    serializer_class = serializers.VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    parser_classes = [parsers.MultiPartParser]

    @action(methods=['get', 'patch'], url_path='current-user', detail=False,
        permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        u = request.user
        if request.method.__eq__('PATCH'):
            for k, v in request.data.items():
                if k in ['first_name', 'last_name']:
                    setattr(u, k, v)
                elif k.__eq__('password'):
                    u.set_password(v)

            u.save()

        return Response(serializers.UserSerializer(u).data)
