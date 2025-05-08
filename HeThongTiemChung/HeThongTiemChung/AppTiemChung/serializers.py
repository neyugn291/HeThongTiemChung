from rest_framework.serializers import ModelSerializer
from rest_framework import serializers


from .models import Vaccine, User, Appointment, VaccinationRecord

class VaccineSerializer(ModelSerializer):
    class Meta:
        model = Vaccine
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    # def validate_email(self, value):
    #     if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
    #         raise serializers.ValidationError("Email không hợp lệ.")
    #     if User.objects.filter(email=value).exists():
    #         raise serializers.ValidationError("Email này đã được sử dụng!")
    #     return value
    #
    # def validate_username(self, value):
    #     if not re.match(r'^[\w\d_-]{3,20}$', value):
    #         raise serializers.ValidationError(
    #             "Tên đăng nhập chỉ chứa chữ, số, dấu gạch dưới hoặc gạch ngang, dài 3-20 ký tự.")
    #     if User.objects.filter(username=value).exists():
    #         raise serializers.ValidationError("Tên đăng nhập đã được sử dụng!")
    #     return value

    def create(self, validated_data):
        data = validated_data.copy()
        u = User(**data)
        u.set_password(u.password)
        u.save()
        return u

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''
        return data

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'avatar']
        extra_kwargs = {'password': {'write_only': True}}

class VaccinationRecordSerializer(ModelSerializer):
    vaccine_name = serializers.CharField(source='vaccine.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    site_address = serializers.CharField(source='site.address', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'id',
            'vaccine',
            'vaccine_name',
            'dose_number',
            'injection_date',
            'site',
            'site_name',
            'site_address',
            'created_date'
        ]

class AppointmentSerializer(ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('created_at', 'user')

