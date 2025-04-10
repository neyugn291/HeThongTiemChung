from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db import models
from cloudinary.models import CloudinaryField


# Create your models here.
class User(AbstractUser):
    citizen_id = models.CharField(max_length=12, verbose_name='CCCD', unique=True, default=0)
    avatar = CloudinaryField(null=True)


class VaccineType(models.Model):
    name = models.CharField(_('name'), max_length=50, unique=True)

    def __str__(self):
        return self.name

def get_default_vaccine_type():
    return VaccineType.objects.get(name='COVID-19').id

class Vaccine(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', _('Dang su dung')
        DISCONTINUED = 'Discontinued', _('Ngung su dung')

    name = models.CharField(max_length=100,verbose_name=_('Ten Vaccine'))
    vaccine_type = models.ForeignKey(VaccineType, on_delete=models.CASCADE,default=get_default_vaccine_type)
    manufacturer = models.CharField(max_length=100, blank=True, null=True)
    dose_count = models.IntegerField(default=1)
    dose_interval = models.CharField(max_length=50, blank=True, null=True)
    age_group = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    approved_date = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    def __str__(self):
        return self.name

