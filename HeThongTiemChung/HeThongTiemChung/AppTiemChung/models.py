from ckeditor.fields import RichTextField
from cloudinary.models import CloudinaryField
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


# Create your models here.
class BaseModel(models.Model):
    active = models.BooleanField(default=True)  # Xác định trạng thái kích hoạt
    created_date = models.DateTimeField(auto_now_add=True, null=True)  # Ngày tạo
    updated_date = models.DateTimeField(auto_now=True, null=True)  # Ngày cập nhật

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

    name = models.CharField(max_length=100, verbose_name=_('Ten Vaccine'))
    image = models.ImageField(upload_to='vaccines', blank=True, null=True)
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
    name = models.CharField(max_length=100)
    address = models.TextField()
    phone = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return self.name


class InjectionSchedule(BaseModel):
    vaccine = models.ForeignKey(Vaccine, on_delete=models.CASCADE)
    site = models.ForeignKey(InjectionSite, on_delete=models.CASCADE)
    date = models.DateField()
    slot_count = models.PositiveIntegerField(default=100)

    def __str__(self):
        return f"{self.vaccine.name} - {self.date}"


class Appointment(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    schedule = models.ForeignKey(InjectionSchedule, on_delete=models.CASCADE)
    registered_at = models.DateTimeField(auto_now_add=True)
    is_confirmed = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.user.username} - {self.schedule}"


class VaccinationRecord(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vaccine = models.ForeignKey(Vaccine, on_delete=models.SET_NULL, null=True)
    dose_number = models.PositiveIntegerField()
    injection_date = models.DateField()
    site = models.ForeignKey(InjectionSite, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.vaccine.name} - Dose {self.dose_number}"
