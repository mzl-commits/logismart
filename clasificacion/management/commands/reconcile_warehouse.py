from django.core.management.base import BaseCommand
from django.db import transaction

from clasificacion.models import Caja, Ubicacion
from clasificacion.services.optimizador import OptimizadorUbicaciones


class Command(BaseCommand):
    help = 'Sincroniza cajas activas con la ocupación física del almacén.'

    @transaction.atomic
    def handle(self, *args, **options):
        Ubicacion.objects.update(estado_ocupacion=False)
        active = Caja.objects.filter(estado__in=['en_transito', 'almacenada'])
        referenced = active.exclude(id_ubicacion=None).select_related('id_ubicacion')
        for caja in referenced:
            if not caja.id_ubicacion.estado_ocupacion:
                OptimizadorUbicaciones.ocupar_ubicacion(caja.id_ubicacion)

        assigned = 0
        unresolved = []
        for caja in active.filter(id_ubicacion=None).order_by('hora_llegada'):
            location = OptimizadorUbicaciones.encontrar_mejor_ubicacion({}, caja=caja)
            if location is None:
                unresolved.append(caja.id)
                caja.estado = 'pendiente'
                caja.save(update_fields=['estado'])
                continue
            caja.id_ubicacion = location
            caja.save(update_fields=['id_ubicacion'])
            OptimizadorUbicaciones.ocupar_ubicacion(location)
            assigned += 1

        self.stdout.write(self.style.SUCCESS(
            f'Ocupación sincronizada: {active.count()} cajas activas, '
            f'{assigned} ubicaciones recuperadas, {len(unresolved)} sin resolver.'
        ))
        if unresolved:
            self.stdout.write(self.style.WARNING('Sin ubicación: ' + ', '.join(unresolved)))
