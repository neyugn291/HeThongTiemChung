from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from cloudinary.models import CloudinaryField
from ckeditor.fields import RichTextField
import uuid
from django.utils import timezone
from rest_framework import permissions
from django.core.exceptions import ValidationError

# Create your models here.
class BaseModel(models.Model):
    active = models.BooleanField(default=True)  # Xác định trạng thái kích hoạt
    created_date = models.DateTimeField(auto_now_add=True,null=True)  # Ngày tạo
    updated_date = models.DateTimeField(auto_now=True,null=True)  # Ngày cập nhật

    class Meta:
        abstract = True

class User(AbstractUser, BaseModel):
    citizen_id = models.CharField(max_length=12, verbose_name='CCCD', unique=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    GENDER_CHOICES = [
        ('M', 'Nam'),
        ('F', 'Nữ'),
        ('O', 'Khác'),
    ]
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        null=True,
        blank=True,
    )

    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=11, unique=True, null=True, blank=True)
    avatar = CloudinaryField(null=True)
    is_verified = models.BooleanField(default=False)  # Xac thuc nguoi dung

    modified_date = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

class VaccineType(BaseModel):
    name = models.CharField(_('name'), max_length=50, unique=True)

    def __str__(self):
        return self.name

def get_default_vaccine_type():
    return VaccineType.objects.get(name='COVID-19').id

class Vaccine(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = 'Active', _('Dang su dung')
        DISCONTINUED = 'Discontinued', _('Ngung su dung')
        PENDING_APPROVAL = 'Pending Approval', _('Chua phe duyet')
        EXPIRED = 'Expired', _('Da het han')

    name = models.CharField(max_length=100,verbose_name=_('Ten Vaccine'))
    image = models.ImageField(upload_to='vaccines',blank=True, null=True)
    vaccine_type = models.ForeignKey(VaccineType, null=True, blank=True, on_delete=models.CASCADE)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    dose_count = models.IntegerField(default=10000)
    dose_interval = models.CharField(max_length=50, blank=True, null=True)
    age_group = models.CharField(max_length=50, blank=True, null=True)
    description = RichTextField(blank=True, null=True)
    approved_date = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    class Meta:
        unique_together = (('name', 'vaccine_type'),)

    def __str__(self):
        return self.name

class InjectionSite(BaseModel):
    name = models.CharField(max_length=100,unique= True)
    address = models.TextField()
    phone = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name

class InjectionSchedule(BaseModel):
    vaccine = models.ForeignKey(Vaccine, on_delete=models.CASCADE)
    site = models.ForeignKey(InjectionSite, on_delete=models.CASCADE)
    date = models.DateField()
    slot_count = models.PositiveIntegerField(default=100)

    class Meta:
        unique_together = ('vaccine', 'site', 'date')

    def __str__(self):
        return f"{self.vaccine.name} - {self.date}"



class Appointment(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    schedule = models.ForeignKey(InjectionSchedule, on_delete=models.CASCADE)
    registered_at = models.DateTimeField(auto_now_add=True)
    reminder_enabled = models.BooleanField(default=False)
    is_confirmed = models.BooleanField(default=False)
    is_inoculated = models.BooleanField(default=False)  # Trường xác nhận đã tiêm hay chưa

    def __str__(self):
        return f"{self.user.username} - {self.schedule}"

    def clean(self):
        # Validation logic: chỉ được phép tiêm nếu đã xác nhận
        if self.is_inoculated and not self.is_confirmed:
            raise ValidationError("Không thể đánh dấu ĐÃ TIÊM khi cuộc hẹn chưa được xác nhận.")

    def save(self, *args, **kwargs):
        self.clean()
        # Kiểm tra nếu lịch hẹn mới được xác nhận
        if self.pk is not None:
            old = Appointment.objects.get(pk=self.pk)
            if not old.is_confirmed and self.is_confirmed:
                if self.schedule.slot_count > 0:
                    self.schedule.slot_count -= 1
                    self.schedule.save()
                else:
                    raise ValueError("Lịch tiêm đã hết chỗ!")
            if old.is_confirmed and not self.is_confirmed:
                self.schedule.slot_count += 1
                self.schedule.save()
        elif self.is_confirmed:  # Trường hợp tạo mới và đã xác nhận luôn
            if self.schedule.slot_count > 0:
                self.schedule.slot_count -= 1
                self.schedule.save()
            else:
                raise ValueError("Lịch tiêm đã hết chỗ!")

        super().save(*args, **kwargs)

        if self.is_inoculated and not hasattr(self, 'vaccinationrecord'):
            self.create_vaccination_record()



    def create_vaccination_record(self):
        # Tạo bản ghi tiêm vaccine khi đã xác nhận tiêm
        previous_doses = VaccinationRecord.objects.filter(
            user=self.user,
            vaccine=self.schedule.vaccine
        ).count()
        VaccinationRecord.objects.create(
            user=self.user,
            vaccine=self.schedule.vaccine,
            dose_number=previous_doses + 1,
            injection_date=self.schedule.date,
            site=self.schedule.site,
        )

    class Meta:
        unique_together = ('user', 'schedule')

class VaccinationRecord(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vaccine = models.ForeignKey(Vaccine, on_delete=models.SET_NULL, null=True)
    dose_number = models.PositiveIntegerField()
    injection_date = models.DateField()
    site = models.ForeignKey(InjectionSite, on_delete=models.SET_NULL, null=True)
    health_note = models.TextField(default=None, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.vaccine.name} - Dose {self.dose_number}"

    class Meta:
        unique_together = ('user', 'vaccine', 'dose_number')

class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"{self.sender}: {self.text[:30]}"
