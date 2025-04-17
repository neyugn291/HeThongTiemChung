from django.contrib import admin

# Register your models here.

from .models import Vaccine, VaccineType, User, InjectionSite, InjectionSchedule, VaccinationRecord, Appointment

admin.site.register(Vaccine)
admin.site.register(VaccineType)
admin.site.register(User)

admin.site.register(InjectionSite)
admin.site.register(InjectionSchedule)
admin.site.register(VaccinationRecord)
admin.site.register(Appointment)
