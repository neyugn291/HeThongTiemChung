from AppTiemChung import dao
from ckeditor_uploader.widgets \
    import CKEditorUploadingWidget
from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import mark_safe

from .models import Vaccine, VaccineType, User, InjectionSite, InjectionSchedule, VaccinationRecord, Appointment


class AppTiemChungAdminSite(admin.AdminSite):
    site_header = 'He Thong Tiem Chung'

    def get_urls(self):
        return [
            path('vaccine-stats/', self.stats_view)
        ] + super().get_urls()

    def stats_view(self, request):
        return TemplateResponse(request, 'admin/stats.html', {
            'stats': dao.count_vaccine_by_type()
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
    list_display = ['id', 'name', 'vaccine_type', 'dose_count', 'image']
    list_filter = ['vaccine_type', 'name']
    form = VaccineForm

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" />')
        return "No Image"

    image_preview.short_description = 'Preview'


class MyUserAdmin(UserAdmin):
    list_display = ['id', 'username', 'email', 'is_active', 'is_staff', 'avatar']
    list_filter = ['is_active']
    search_fields = ['username', 'email']
    ordering = ['id']

    # fieldsets = UserAdmin.fieldsets + (
    #     ('Thông tin bổ sung', {'fields': ('role', 'avatar')}),
    # )


class InjectionScheduleForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Giới thiệu chi tiết lịch tiêm nếu có

    class Meta:
        model = InjectionSchedule
        fields = '__all__'


class InjectionScheduleAdmin(admin.ModelAdmin):
    # Hiển thị các trường trong list view
    list_display = ['id', 'vaccine', 'site', 'date', 'slot_count']

    # Thêm filter để lọc theo vaccine và site
    list_filter = ['vaccine', 'site']

    # Tìm kiếm theo vaccine name hoặc site name
    search_fields = ['vaccine__name', 'site__name']

    # Cho phép chỉnh sửa nhiều record cùng lúc
    actions = ['mark_as_active', 'mark_as_inactive']

    # Thêm form tuỳ chỉnh cho việc tạo/edit InjectionSchedule
    form = InjectionScheduleForm

    # Cho phép chỉnh sửa một số thông tin trên bảng chi tiết lịch tiêm
    fieldsets = (
        (None, {
            'fields': ('vaccine', 'site', 'date', 'slot_count')
        }),
        ('Description', {
            'fields': ('description',),
        }),
    )


class InjectionSiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'created_at')  # Chỉnh sửa các trường cần hiển thị trong danh sách
    search_fields = ('name', 'address')  # Thêm khả năng tìm kiếm theo tên và địa chỉ
    list_filter = ('created_at',)  # Thêm khả năng lọc theo ngày tạo
    ordering = ('-created_at',)  # Sắp xếp theo ngày tạo, mới nhất lên trên


from django.contrib import admin
from .models import ChatMessage


class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'text', 'timestamp')
    search_fields = ('sender', 'text')


admin_site.register(User, MyUserAdmin)

admin_site.register(InjectionSite, InjectionSiteAdmin)
admin_site.register(InjectionSchedule, InjectionScheduleAdmin)
admin_site.register(VaccinationRecord)
admin_site.register(Appointment)

admin_site.register(VaccineType, VaccineTypeAdmin)
admin_site.register(Vaccine, VaccineAdmin)

admin_site.register(ChatMessage, ChatMessageAdmin)
