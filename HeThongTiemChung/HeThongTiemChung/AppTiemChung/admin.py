from django.contrib import admin
from .models import Vaccine, VaccineType, User, InjectionSite, InjectionSchedule, VaccinationRecord, Appointment

from django import forms
from ckeditor_uploader.widgets \
    import CKEditorUploadingWidget

from django.utils.html import mark_safe

class VaccineTypeAdmin(admin.ModelAdmin):
    pass

class VaccineAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'vaccine_type', 'dose_count','image']
    list_filter = ['vaccine_type', 'name']


class VaccineForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())
    class Meta:
        model = Vaccine
        fields = '__all__'


# Register your models here.


admin.site.register(User)

admin.site.register(InjectionSite)
admin.site.register(InjectionSchedule)
admin.site.register(VaccinationRecord)
admin.site.register(Appointment)



admin.site.register(VaccineType, VaccineTypeAdmin)
admin.site.register(Vaccine, VaccineAdmin)