from django.shortcuts import render
from django.http import HttpResponse

def index(request):
    return HttpResponse("Vaccination App")

from rest_framework import viewsets, permissions, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Vaccine, User
from django.contrib.auth.hashers import make_password
from AppTiemChung import serializers

class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.filter(active=True)
    serializer_class = serializers.VaccineSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    parser_classes = [parsers.MultiPartParser]

    def create(self, request, *args, **kwargs):
        """
        Xử lý yêu cầu POST để đăng ký người dùng mới
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Mã hóa mật khẩu trước khi lưu
            serializer.validated_data['password'] = make_password(serializer.validated_data['password'])
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response({"message": "Đăng ký thành công"}, status=status.HTTP_201_CREATED, headers=headers)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get', 'patch'], url_path='current-user', detail=False, permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        """
        Lấy hoặc cập nhật thông tin người dùng hiện tại
        """
        u = request.user
        if request.method.__eq__('PATCH'):
            for k, v in request.data.items():
                if k in ['first_name', 'last_name']:
                    setattr(u, k, v)
                elif k.__eq__('password'):
                    u.set_password(v)

            u.save()

        return Response(serializers.UserSerializer(u).data)
