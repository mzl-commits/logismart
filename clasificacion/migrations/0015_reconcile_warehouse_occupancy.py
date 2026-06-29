from django.db import migrations


def reconcile_occupancy(apps, schema_editor):
    Caja = apps.get_model('clasificacion', 'Caja')
    Ubicacion = apps.get_model('clasificacion', 'Ubicacion')

    # La ocupación física se deriva de cajas activas reservadas o almacenadas.
    Ubicacion.objects.update(estado_ocupacion=False)
    active = Caja.objects.filter(estado__in=['en_transito', 'almacenada'])

    referenced_ids = list(
        active.exclude(id_ubicacion_id=None)
        .values_list('id_ubicacion_id', flat=True)
        .distinct()
    )
    if referenced_ids:
        Ubicacion.objects.filter(pk__in=referenced_ids).update(estado_ocupacion=True)

    # Reubica datos legacy que indicaban "almacenada" sin casillero físico.
    for caja in active.filter(id_ubicacion_id=None).order_by('hora_llegada'):
        candidates = Ubicacion.objects.filter(
            estado_ocupacion=False,
            capacidad_peso_kg__gte=caja.peso_kg,
        )
        if caja.es_fragil:
            candidates = candidates.filter(permite_fragil=True)
        if caja.categoria == 'quimico':
            candidates = candidates.filter(permite_quimico=True)
        location = candidates.order_by('nivel', 'pasillo', 'estante', 'lado', 'casillero').first()
        if location:
            caja.id_ubicacion_id = location.pk
            caja.save(update_fields=['id_ubicacion'])
            location.estado_ocupacion = True
            location.save(update_fields=['estado_ocupacion'])
        else:
            # Una caja sin casillero no puede considerarse físicamente almacenada.
            caja.estado = 'pendiente'
            caja.save(update_fields=['estado'])


class Migration(migrations.Migration):
    dependencies = [('clasificacion', '0014_planilla_completada')]
    operations = [migrations.RunPython(reconcile_occupancy, migrations.RunPython.noop)]
