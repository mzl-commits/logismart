from collections import Counter

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from clasificacion.models import Caja, Ubicacion
from clasificacion.services.optimizador import OptimizadorUbicaciones


class Command(BaseCommand):
    help = 'Audita compatibilidad, exclusividad y ocupacion del almacen; --apply reubica de forma atomica.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Reubica asignaciones incompatibles y corrige banderas de ocupacion.',
        )

    def handle(self, *args, **options):
        aplicar = options['apply']
        with transaction.atomic():
            ubicaciones = list(
                Ubicacion.objects.select_for_update()
                .order_by('pasillo', 'estante', 'nivel', 'lado', 'casillero')
            )
            cajas = list(
                Caja.objects.select_for_update()
                .filter(
                    estado__in=OptimizadorUbicaciones.ESTADOS_EN_ALMACEN,
                    id_ubicacion__isnull=False,
                )
                .select_related('id_medida', 'id_ubicacion')
                .order_by('hora_llegada', 'id')
            )

            invalidas, hallazgos = self._evaluar_asignaciones(cajas)
            ocupacion_esperada = {caja.id_ubicacion_id for caja in cajas}
            desajustes = [
                ubicacion for ubicacion in ubicaciones
                if ubicacion.estado_ocupacion != (ubicacion.id_ubicacion in ocupacion_esperada)
            ]

            self._imprimir_resumen(ubicaciones, cajas, invalidas, desajustes, hallazgos)
            if not aplicar:
                self.stdout.write(self.style.WARNING(
                    'Diagnostico solamente. Use --apply para reubicar y reconciliar ocupacion.'
                ))
                return

            if invalidas:
                self._reubicar_invalidas(cajas, invalidas)
            self._reconciliar_ocupacion()

            restantes = self._asignaciones_invalidas_actuales()
            if restantes:
                ids = ', '.join(str(caja.id) for caja in restantes)
                raise CommandError(f'La auditoria posterior aun detecta incompatibilidades: {ids}')

            self.stdout.write(self.style.SUCCESS(
                f'Auditoria aplicada: {len(invalidas)} caja(s) reubicada(s) y ocupacion reconciliada.'
            ))

    @staticmethod
    def _evaluar_asignaciones(cajas):
        invalidas = []
        hallazgos = []
        primera_por_ubicacion = {}

        for caja in cajas:
            ubicacion_id = caja.id_ubicacion_id
            if ubicacion_id in primera_por_ubicacion:
                invalidas.append(caja)
                hallazgos.append((
                    caja,
                    [f'Ubicacion duplicada con la caja {primera_por_ubicacion[ubicacion_id]}'],
                ))
                continue

            primera_por_ubicacion[ubicacion_id] = caja.id
            compatible, detalle = OptimizadorUbicaciones.validar_ubicacion(
                caja,
                caja.id_ubicacion,
                permitir_ocupada=True,
            )
            if not compatible:
                invalidas.append(caja)
                hallazgos.append((caja, detalle.get('motivos', [])))
        return invalidas, hallazgos

    def _imprimir_resumen(self, ubicaciones, cajas, invalidas, desajustes, hallazgos):
        por_zona = Counter(ubicacion.tipo_estante for ubicacion in ubicaciones)
        ocupadas = len({caja.id_ubicacion_id for caja in cajas})
        porcentaje = (ocupadas / len(ubicaciones) * 100) if ubicaciones else 0
        self.stdout.write('=== Auditoria de slotting v2 ===')
        self.stdout.write(
            f'Espacios: {len(ubicaciones)} | En uso: {ocupadas} ({porcentaje:.1f}%) | '
            f'Asignaciones activas: {len(cajas)}'
        )
        self.stdout.write('Zonas: ' + ', '.join(
            f'{zona}={cantidad}' for zona, cantidad in sorted(por_zona.items())
        ))
        self.stdout.write(
            f'Asignaciones incompatibles/duplicadas: {len(invalidas)} | '
            f'Desajustes de bandera: {len(desajustes)}'
        )
        for caja, motivos in hallazgos:
            self.stdout.write(self.style.ERROR(
                f'- {caja.id} en {caja.id_ubicacion}: {"; ".join(motivos)}'
            ))

    @staticmethod
    def _reubicar_invalidas(cajas, invalidas):
        ids_invalidas = {str(caja.id) for caja in invalidas}
        ubicaciones_validas = {
            caja.id_ubicacion_id for caja in cajas if str(caja.id) not in ids_invalidas
        }

        for caja in invalidas:
            caja.id_ubicacion = None
            caja.save(update_fields=['id_ubicacion'])

        Ubicacion.objects.update(estado_ocupacion=False)
        Ubicacion.objects.filter(pk__in=ubicaciones_validas).update(estado_ocupacion=True)

        plan = OptimizadorUbicaciones.recomendar_lote(invalidas)
        sin_espacio = [
            caja.id for caja in invalidas if not plan.get(str(caja.id), (None, None))[0]
        ]
        if sin_espacio:
            raise CommandError(
                'No existe una reubicacion factible para: ' + ', '.join(map(str, sin_espacio))
            )

        for caja in invalidas:
            ubicacion, _ = plan[str(caja.id)]
            caja.id_ubicacion = ubicacion
            caja.save(update_fields=['id_ubicacion'])
            Ubicacion.objects.filter(pk=ubicacion.pk).update(estado_ocupacion=True)

    @staticmethod
    def _reconciliar_ocupacion():
        ids_ocupados = Caja.objects.filter(
            estado__in=OptimizadorUbicaciones.ESTADOS_EN_ALMACEN,
            id_ubicacion__isnull=False,
        ).values_list('id_ubicacion_id', flat=True)
        Ubicacion.objects.update(estado_ocupacion=False)
        Ubicacion.objects.filter(pk__in=ids_ocupados).update(estado_ocupacion=True)

    @staticmethod
    def _asignaciones_invalidas_actuales():
        cajas = Caja.objects.filter(
            estado__in=OptimizadorUbicaciones.ESTADOS_EN_ALMACEN,
            id_ubicacion__isnull=False,
        ).select_related('id_medida', 'id_ubicacion').order_by('hora_llegada', 'id')
        invalidas = []
        usadas = set()
        for caja in cajas:
            if caja.id_ubicacion_id in usadas:
                invalidas.append(caja)
                continue
            usadas.add(caja.id_ubicacion_id)
            compatible, _ = OptimizadorUbicaciones.validar_ubicacion(
                caja, caja.id_ubicacion, permitir_ocupada=True,
            )
            if not compatible:
                invalidas.append(caja)
        return invalidas
