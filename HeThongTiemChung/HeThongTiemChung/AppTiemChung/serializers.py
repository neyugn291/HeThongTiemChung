import re
from datetime import date, datetime
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from .models import Vaccine, User, Appointment, VaccinationRecord, InjectionSchedule, InjectionSite, ChatMessage


class VaccineSerializer(ModelSerializer):
    class Meta:
        model = Vaccine
        fields = '__all__'

    def get_vaccine_type_name(self, obj):
        return obj.vaccine_type.name if obj.vaccine_type else None


class UserSerializer(serializers.ModelSerializer):
    def validate_email(self, value):
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError("Email không hợp lệ.")
        # Kiểm tra email trùng, nhưng loại trừ email của chính người dùng hiện tại
        if User.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Email này đã được sử dụng!")
        return value

    def validate_phone_number(self, value):
        if value and not re.match(r'^\d{10,15}$', value):
            raise serializers.ValidationError("Số điện thoại phải chứa 10-15 chữ số.")
        return value

    def validate_citizen_id(self, value):
        if value and not re.match(r'^\d{9,12}$', value):
            raise serializers.ValidationError("Căn cước công dân phải chứa 9-12 chữ số.")
        return value

    def validate_birth_date(self, value):
        if not value:
            return None

        try:
            if isinstance(value, str):
                if not re.match(r'^\d{4}-\d{2}-\d{2}$', value):
                    raise serializers.ValidationError("Định dạng ngày sinh không hợp lệ (YYYY-MM-DD).")
                birth_date = datetime.strptime(value, '%Y-%m-%d').date()
                print("Validated birth_date:", birth_date)  # Debug
                today = date.today()
                if birth_date > today:
                    raise serializers.ValidationError("Ngày sinh không thể ở tương lai.")
                if birth_date.year < 1900:
                    raise serializers.ValidationError("Năm sinh phải lớn hơn hoặc bằng 1900.")
                days_in_month = (date(birth_date.year, birth_date.month + 1, 1) - date(birth_date.year, birth_date.month, 1)).days
                if birth_date.day > days_in_month:
                    raise serializers.ValidationError(
                        f"Ngày không hợp lệ. Tháng {birth_date.month} năm {birth_date.year} chỉ có {days_in_month} ngày."
                    )
                return birth_date
            raise serializers.ValidationError("Ngày sinh phải là chuỗi định dạng YYYY-MM-DD.")
        except ValueError as e:
            raise serializers.ValidationError(f"Định dạng ngày sinh không hợp lệ (YYYY-MM-DD): {str(e)}")

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
        fields = ['username', 'email', 'password', 'avatar', 'is_superuser', 'is_staff', 'is_active',
                  'first_name', 'last_name', 'citizen_id', 'phone_number', 'birth_date', 'gender']
        extra_kwargs = {'password': {'write_only': True},
                        'first_name': {'required': False, 'allow_blank': False},
                        'last_name': {'required': False, 'allow_blank': False},
                        'is_active': {'default': True}}


class VaccinationRecordSerializer(ModelSerializer):
    vaccine_name = serializers.CharField(source='vaccine.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    site_address = serializers.CharField(source='site.address', read_only=True)

    class Meta:
        model = VaccinationRecord
        # fields = [
        #     'id',
        #     'vaccine',
        #     'vaccine_name',
        #     'dose_number',
        #     'injection_date',
        #     'site',
        #     'site_name',
        #     'site_address',
        #     'created_date'
        #     'health_note'
        # ]
        fields = '__all__'


class AppointmentSerializer(ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('created_at', 'user')

class InjectionScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = InjectionSchedule
        fields = '__all__'

class InjectionSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InjectionSite
        fields = ['id', 'name', 'address', 'phone']

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'text', 'timestamp']