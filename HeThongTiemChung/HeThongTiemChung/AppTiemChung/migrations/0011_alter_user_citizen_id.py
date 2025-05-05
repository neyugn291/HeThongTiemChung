
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('AppTiemChung', '0010_alter_vaccine_description'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='citizen_id',
            field=models.CharField(max_length=12, null=True, unique=True, verbose_name='CCCD'),
        ),
    ]
