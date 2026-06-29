from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clasificacion', '0013_alter_configcarro_pos_base_x_planilla'),
    ]

    operations = [
        migrations.AddField(
            model_name='planilla', name='completada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='planilla', name='fecha_completada',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='planilla', name='completada_por',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='planillas_completadas', to=settings.AUTH_USER_MODEL,
                db_column='id_completada_por',
            ),
        ),
    ]
