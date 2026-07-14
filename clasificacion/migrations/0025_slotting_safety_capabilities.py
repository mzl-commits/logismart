from django.db import migrations


def add_protected_capacity(apps, schema_editor):
    Ubicacion = apps.get_model('clasificacion', 'Ubicacion')

    # Los racks quimicos usan bandeja de contencion y sujecion de envases.
    Ubicacion.objects.filter(
        pasillo='B',
        estante=1,
        tipo_estante='quimico',
    ).update(permite_fragil=True)

    # Dos huecos frontales a nivel de piso quedan preparados para carga pesada fragil.
    Ubicacion.objects.filter(
        pasillo='A',
        estante=2,
        nivel=1,
        lado='adelante',
        tipo_estante='pesado',
    ).update(permite_fragil=True)


class Migration(migrations.Migration):

    dependencies = [
        ('clasificacion', '0024_warehouse_slotting_v2'),
    ]

    operations = [
        migrations.RunPython(add_protected_capacity, migrations.RunPython.noop),
    ]
