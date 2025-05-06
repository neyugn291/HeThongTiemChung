from django.contrib import admin
from django.template.response import TemplateResponse
from django.contrib.auth.admin import UserAdmin

from .models import Vaccine, VaccineType, User, InjectionSite, InjectionSchedule, VaccinationRecord, Appointment
from django.utils.html import mark_safe
from django import forms
from ckeditor_uploader.widgets \
    import CKEditorUploadingWidget

from django.utils.html import mark_safe

from django.urls import path
from AppTiemChung import dao


class AppTiemChungAdminSite(admin.AdminSite):
    site_header = 'He Thong Tiem Chung'


    def get_urls(self):
        return [
            path('vaccine-stats/', self.stats_view)
        ] + super().get_urls()

    def stats_view(self, request):
        return TemplateResponse(request, 'admin/stats.html', {
            'stats':dao.count_vaccine_by_type()
        })

admin_site = AppTiemChungAdminSite(name='vaccinationApp')

class VaccineTypeAdmin(admin.ModelAdmin):
    pass

class VaccineForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())
    class Meta:
        model = Vaccine
        fields = '__all__'

class VaccineAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'vaccine_type', 'dose_count','image']
    list_filter = ['vaccine_type', 'name']
    form = VaccineForm

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" />')
        return "No Image"

    image_preview.short_description = 'Preview'

class MyUserAdmin(UserAdmin):
    list_display = ['id', 'username', 'email', 'is_active', 'is_staff', 'avatar']
    list_filter = [ 'is_active']
    search_fields = ['username', 'email']
    ordering = ['id']

    # fieldsets = UserAdmin.fieldsets + (
    #     ('Thông tin bổ sung', {'fields': ('role', 'avatar')}),
    # )


admin_site.register(User, MyUserAdmin)

admin_site.register(InjectionSite)
admin_site.register(InjectionSchedule)
admin_site.register(VaccinationRecord)
admin_site.register(Appointment)



admin_site.register(VaccineType, VaccineTypeAdmin)
admin_site.register(Vaccine, VaccineAdmin)