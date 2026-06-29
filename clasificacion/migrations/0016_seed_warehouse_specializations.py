from django.db import migrations
from decimal import Decimal


def seed_specializations(apps, schema_editor):
    Ubicacion = apps.get_model('clasificacion', 'Ubicacion')

    # Cada estante constituye una zona logística; los niveles afinan la capacidad.
    zones = {
        ('A', 1): dict(tipo_estante='fragil', permite_fragil=True, permite_quimico=False, prioridad_categoria='electronica'),
        ('A', 2): dict(tipo_estante='pesado', permite_fragil=False, permite_quimico=False, prioridad_categoria='herramienta'),
        ('A', 3): dict(tipo_estante='refrigerado', permite_fragil=True, permite_quimico=False, prioridad_categoria='alimento'),
        ('B', 1): dict(tipo_estante='quimico', permite_fragil=False, permite_quimico=True, prioridad_categoria='quimico'),
        ('B', 2): dict(tipo_estante='general', permite_fragil=True, permite_quimico=False, prioridad_categoria='textil'),
        ('B', 3): dict(tipo_estante='general', permite_fragil=True, permite_quimico=False, prioridad_categoria='otro'),
    }
    capacities = {
        'fragil': {1: Decimal('40'), 2: Decimal('35'), 3: Decimal('25')},
        'pesado': {1: Decimal('150'), 2: Decimal('100'), 3: Decimal('60')},
        'refrigerado': {1: Decimal('60'), 2: Decimal('45'), 3: Decimal('30')},
        'quimico': {1: Decimal('100'), 2: Decimal('75'), 3: Decimal('50')},
        'general': {1: Decimal('80'), 2: Decimal('60'), 3: Decimal('40')},
    }

    for location in Ubicacion.objects.all():
        # Respeta configuraciones personalizadas existentes; solo recupera
        # instalaciones que conservaron todos los valores genéricos iniciales.
        is_default = (
            location.tipo_estante == 'general'
            and location.capacidad_peso_kg == Decimal('50')
            and location.permite_fragil is True
            and location.permite_quimico is False
            and location.prioridad_categoria == 'sin_preferencia'
        )
        if not is_default:
            continue
        zone = zones.get((location.pasillo.upper(), location.estante), zones[('B', 3)])
        for field, value in zone.items():
            setattr(location, field, value)
        location.capacidad_peso_kg = capacities[zone['tipo_estante']].get(location.nivel, Decimal('40'))
        location.save(update_fields=[
            'tipo_estante', 'capacidad_peso_kg', 'permite_fragil',
            'permite_quimico', 'prioridad_categoria',
        ])


class Migration(migrations.Migration):
    dependencies = [('clasificacion', '0015_reconcile_warehouse_occupancy')]
    operations = [migrations.RunPython(seed_specializations, migrations.RunPython.noop)]
