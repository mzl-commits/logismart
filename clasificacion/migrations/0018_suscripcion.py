from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('clasificacion', '0017_inventory_core'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name='Suscripcion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_customer_id', models.CharField(blank=True, max_length=80, null=True, unique=True)),
                ('stripe_subscription_id', models.CharField(blank=True, max_length=80, null=True, unique=True)),
                ('stripe_price_id', models.CharField(blank=True, max_length=80)),
                ('estado', models.CharField(choices=[('incomplete','Incompleta'),('incomplete_expired','Expirada'),('trialing','En prueba'),('active','Activa'),('past_due','Pago pendiente'),('canceled','Cancelada'),('unpaid','Impaga'),('paused','Pausada')], default='incomplete', max_length=24)),
                ('periodo_fin', models.DateTimeField(blank=True, null=True)),
                ('cancela_al_final', models.BooleanField(default=False)),
                ('ultimo_evento', models.CharField(blank=True, max_length=80)),
                ('creada_en', models.DateTimeField(auto_now_add=True)),
                ('actualizada_en', models.DateTimeField(auto_now=True)),
                ('usuario', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='suscripcion_logismart', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'suscripcion_logismart'},
        ),
    ]
