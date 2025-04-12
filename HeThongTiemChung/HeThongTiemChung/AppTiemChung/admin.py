from django.contrib import admin

# Register your models here.

from .models import Vaccine, VaccineType, User

admin.site.register(Vaccine)
admin.site.register(VaccineType)
admin.site.register(User)