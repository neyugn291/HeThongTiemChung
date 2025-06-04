from datetime import date

from AppTiemChung.models import Appointment
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils.timezone import timedelta


class Command(BaseCommand):
    help = 'Send reminder emails for appointments scheduled for tomorrow'

    def handle(self, *args, **kwargs):
        tomorrow = date.today() + timedelta(days=1)
        appointments = Appointment.objects.filter(
            schedule__date=tomorrow,
            is_confirmed=True,
            reminder_enabled=True
        )

        count = 0
        for appt in appointments:
            send_mail(
                'Nhắc nhở lịch tiêm',
                f'Bạn có lịch hẹn vào ngày {appt.schedule.date} tại {appt.schedule.site.name}.',
                settings.EMAIL_HOST_USER,
                [appt.user.email],
                fail_silently=False,
            )
            count += 1

        self.stdout.write(f"Đã gửi nhắc nhở {count} cuộc hẹn.")
        import os
        os.system("pause")
