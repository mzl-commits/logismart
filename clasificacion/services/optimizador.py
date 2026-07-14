import logging
from collections import Counter
from decimal import Decimal

import networkx as nx

from clasificacion.models import Caja, Ubicacion
from clasificacion.services.clasificador import ClasificadorCajas

logger = logging.getLogger('clasificacion')


class OptimizadorUbicaciones:
    """Motor de slotting v2: factibilidad estricta y optimización explicable."""

    VERSION = '2.0'
    ESTADOS_EN_ALMACEN = ('en_transito', 'almacenada')

    @classmethod
    def encontrar_mejor_ubicacion(
        cls, clasificacion, caja=None, incluir_detalle=False, excluir_ids=None,
    ):
        if caja is None:
            logger.warning('No se puede recomendar una ubicación sin datos de la caja.')
            return (None, None) if incluir_detalle else None

        candidatos = cls.evaluar_candidatos(
            caja, clasificacion=clasificacion, excluir_ids=excluir_ids,
        )
        if not candidatos:
            logger.warning(
                'No hay ubicaciones compatibles para caja %s (peso total=%s, frágil=%s, categoría=%s).',
                caja.id, clasificacion.get('peso_total_kg'), caja.es_fragil, caja.categoria,
            )
            return (None, None) if incluir_detalle else None

        ubicacion, detalle = candidatos[0]
        return (ubicacion, detalle) if incluir_detalle else ubicacion

    @classmethod
    def evaluar_candidatos(cls, caja, clasificacion=None, excluir_ids=None, contexto=None):
        clasificacion = clasificacion or ClasificadorCajas.clasificar(caja)
        excluir_ids = {int(value) for value in (excluir_ids or [])}
        peso_total = Decimal(str(clasificacion.get('peso_total_kg', 0)))

        qs = Ubicacion.objects.filter(
            estado_ocupacion=False,
            activo=True,
            capacidad_peso_kg__gte=peso_total,
        )
        if excluir_ids:
            qs = qs.exclude(pk__in=excluir_ids)
        if caja.es_fragil:
            qs = qs.filter(permite_fragil=True)
        if caja.categoria == 'quimico':
            qs = qs.filter(tipo_estante='quimico', permite_quimico=True)
        else:
            qs = qs.exclude(tipo_estante='quimico')
        if getattr(caja, 'requiere_refrigeracion', False):
            qs = qs.filter(tipo_estante='refrigerado')
        else:
            qs = qs.exclude(tipo_estante='refrigerado')

        contexto = contexto or cls._crear_contexto()
        candidatos = []
        for ubicacion in qs.order_by('pasillo', 'estante', 'nivel', 'lado', 'casillero'):
            compatible, razones, encaje = cls._es_compatible(ubicacion, caja, clasificacion)
            if not compatible:
                continue
            score, motivos, componentes, metricas = cls._calcular_puntuacion(
                ubicacion, caja, clasificacion, encaje, contexto,
            )
            candidatos.append((ubicacion, {
                'score': score,
                'motivos': razones + motivos,
                'componentes': componentes,
                'metricas': metricas,
                'version_algoritmo': cls.VERSION,
            }))

        candidatos.sort(key=lambda item: (
            -item[1]['score'],
            float(item[0].distancia_salida_m),
            item[0].nivel,
            item[0].pasillo,
            item[0].estante,
            item[0].lado,
            item[0].casillero,
        ))
        return candidatos

    @classmethod
    def validar_ubicacion(cls, caja, ubicacion, permitir_ocupada=False, contexto=None):
        """Valida y puntua una asignacion explicita con las mismas reglas del motor."""
        clasificacion = ClasificadorCajas.clasificar(caja)
        compatible, razones, encaje = cls._es_compatible(
            ubicacion,
            caja,
            clasificacion,
            permitir_ocupada=permitir_ocupada,
        )
        if not compatible:
            return False, {
                'score': 0,
                'motivos': razones,
                'componentes': {},
                'metricas': {
                    'peso_total_kg': float(clasificacion.get('peso_total_kg', 0)),
                },
                'version_algoritmo': cls.VERSION,
            }

        score, motivos, componentes, metricas = cls._calcular_puntuacion(
            ubicacion,
            caja,
            clasificacion,
            encaje,
            contexto or cls._crear_contexto(),
        )
        return True, {
            'score': score,
            'motivos': razones + motivos,
            'componentes': componentes,
            'metricas': metricas,
            'version_algoritmo': cls.VERSION,
        }

    @classmethod
    def recomendar_lote(cls, cajas, ubicaciones_excluidas=None):
        """
        Resuelve el lote como matching bipartito global. Maximiza primero la
        cantidad de cajas asignadas y despues la suma de sus puntuaciones.
        """
        cajas = list(cajas)
        excluidas = {int(value) for value in (ubicaciones_excluidas or [])}
        resultado = {str(caja.id): (None, None) for caja in cajas}
        contexto = cls._crear_contexto()
        grafo = nx.Graph()
        alternativas = {}

        for indice, caja in enumerate(cajas):
            nodo_caja = ('caja', indice, str(caja.id))
            grafo.add_node(nodo_caja, bipartite=0)
            candidatos = cls.evaluar_candidatos(
                caja,
                clasificacion=ClasificadorCajas.clasificar(caja),
                excluir_ids=excluidas,
                contexto=contexto,
            )
            for rango, (ubicacion, detalle) in enumerate(candidatos):
                nodo_ubicacion = ('ubicacion', ubicacion.id_ubicacion)
                grafo.add_node(nodo_ubicacion, bipartite=1)
                # Un punto de score domina todos los desempates de un lote de 100 cajas.
                peso_arista = detalle['score'] * 1_000_000 + max(0, 10_000 - rango)
                grafo.add_edge(nodo_caja, nodo_ubicacion, weight=peso_arista)
                alternativas[(nodo_caja, nodo_ubicacion)] = (ubicacion, detalle)

        matching = nx.algorithms.matching.max_weight_matching(
            grafo,
            maxcardinality=True,
            weight='weight',
        )
        for izquierda, derecha in matching:
            if izquierda[0] == 'ubicacion':
                izquierda, derecha = derecha, izquierda
            if izquierda[0] != 'caja':
                continue
            ubicacion, detalle = alternativas[(izquierda, derecha)]
            resultado[izquierda[2]] = (
                ubicacion,
                {
                    **detalle,
                    'optimizacion_lote': 'max_weight_bipartite_matching',
                },
            )

        return resultado

    @classmethod
    def _crear_contexto(cls):
        familias = Counter()
        ocupacion_estante = Counter()
        rows = Caja.objects.filter(
            estado__in=cls.ESTADOS_EN_ALMACEN,
            id_ubicacion__isnull=False,
        ).values_list(
            'id_ubicacion__pasillo', 'id_ubicacion__estante', 'categoria',
        )
        for pasillo, estante, categoria in rows:
            familias[(pasillo, estante, categoria)] += 1
            ocupacion_estante[(pasillo, estante)] += 1
        return {'familias': familias, 'ocupacion_estante': ocupacion_estante}

    @classmethod
    def _es_compatible(cls, ubicacion, caja, clasificacion=None, permitir_ocupada=False):
        clasificacion = clasificacion or ClasificadorCajas.clasificar(caja)
        razones = []

        if not ubicacion.activo:
            return False, ['Ubicación fuera de servicio'], None
        if ubicacion.estado_ocupacion and not permitir_ocupada:
            return False, ['Ubicación ocupada'], None

        peso_total = Decimal(str(clasificacion.get('peso_total_kg', 0)))
        if peso_total > ubicacion.capacidad_peso_kg:
            return False, [
                f'Peso total {peso_total} kg supera la capacidad de {ubicacion.capacidad_peso_kg} kg',
            ], None
        if caja.es_fragil and not ubicacion.permite_fragil:
            return False, ['El estante no admite carga frágil'], None

        if caja.categoria == 'quimico':
            if ubicacion.tipo_estante != 'quimico' or not ubicacion.permite_quimico:
                return False, ['Los químicos requieren una zona química aislada'], None
        elif ubicacion.tipo_estante == 'quimico':
            return False, ['Zona química reservada exclusivamente para químicos'], None

        requiere_frio = bool(getattr(caja, 'requiere_refrigeracion', False))
        if requiere_frio and ubicacion.tipo_estante != 'refrigerado':
            return False, ['El producto requiere cadena de frío'], None
        if not requiere_frio and ubicacion.tipo_estante == 'refrigerado':
            return False, ['Zona refrigerada reservada para productos que requieren frío'], None

        encaje = cls._evaluar_encaje(ubicacion, clasificacion)
        if not encaje['cabe']:
            return False, [encaje['motivo']], encaje

        razones.extend([
            'Ubicación activa y libre',
            'Peso total dentro de capacidad',
            f"Dimensiones compatibles ({encaje['orientacion']})",
        ])
        return True, razones, encaje

    @staticmethod
    def _evaluar_encaje(ubicacion, clasificacion):
        dims = clasificacion.get('dimensiones') or {}
        largo = Decimal(str(dims.get('largo_cm') or 0))
        ancho = Decimal(str(dims.get('ancho_cm') or 0))
        alto = Decimal(str(dims.get('alto_cm') or 0))
        if not largo or not ancho or not alto:
            return {'cabe': True, 'orientacion': 'dimensiones no informadas', 'uso_volumen': Decimal('0')}

        orientaciones = [
            ('base original', largo, ancho),
            ('base girada 90°', ancho, largo),
        ]
        orientacion = next((
            nombre for nombre, frente, fondo in orientaciones
            if frente <= ubicacion.ancho_util_cm
            and fondo <= ubicacion.fondo_util_cm
            and alto <= ubicacion.alto_util_cm
        ), None)
        if not orientacion:
            return {
                'cabe': False,
                'orientacion': None,
                'uso_volumen': Decimal('0'),
                'motivo': (
                    f'Caja {largo}×{ancho}×{alto} cm no cabe en hueco '
                    f'{ubicacion.ancho_util_cm}×{ubicacion.fondo_util_cm}×{ubicacion.alto_util_cm} cm'
                ),
            }
        capacidad_volumen = ubicacion.capacidad_volumen_cm3
        volumen = Decimal(str(clasificacion.get('volumen_cm3') or 0))
        uso_volumen = volumen / capacidad_volumen if capacidad_volumen else Decimal('0')
        return {'cabe': True, 'orientacion': orientacion, 'uso_volumen': uso_volumen}

    @classmethod
    def _calcular_puntuacion(cls, ubicacion, caja, clasificacion, encaje, contexto):
        motivos = []
        componentes = {}
        peso_total = Decimal(str(clasificacion.get('peso_total_kg', 0)))
        uso_peso = peso_total / ubicacion.capacidad_peso_kg if ubicacion.capacidad_peso_kg else Decimal('0')
        uso_volumen = encaje.get('uso_volumen', Decimal('0'))

        zona = cls._puntuar_zona(ubicacion, caja, peso_total, motivos)
        ergonomia = cls._puntuar_ergonomia(ubicacion, caja, peso_total, motivos)
        capacidad = cls._puntuar_capacidad(uso_peso, uso_volumen, motivos)
        accesibilidad = cls._puntuar_accesibilidad(ubicacion, caja, clasificacion, motivos)

        misma_familia = contexto['familias'][(ubicacion.pasillo, ubicacion.estante, caja.categoria)]
        ocupadas_estante = contexto['ocupacion_estante'][(ubicacion.pasillo, ubicacion.estante)]
        consolidacion = min(8, misma_familia * 2) + (2 if ocupadas_estante else 0)
        if misma_familia:
            motivos.append(f'Consolida {caja.categoria} con {misma_familia} caja(s) del mismo estante')

        recurso = cls._puntuar_preservacion(ubicacion, caja, peso_total, motivos)
        componentes.update({
            'zona_y_seguridad': zona,
            'ergonomia': ergonomia,
            'ajuste_capacidad': capacidad,
            'accesibilidad': accesibilidad,
            'consolidacion': consolidacion,
            'preservacion_recurso': recurso,
        })
        score = max(0, min(100, int(round(sum(componentes.values())))))
        metricas = {
            'peso_total_kg': float(peso_total),
            'utilizacion_peso_pct': round(float(uso_peso * 100), 1),
            'volumen_caja_cm3': float(clasificacion.get('volumen_cm3', 0)),
            'utilizacion_volumen_pct': round(float(uso_volumen * 100), 1),
            'distancia_salida_m': float(ubicacion.distancia_salida_m),
            'orientacion': encaje.get('orientacion'),
        }
        return score, motivos, componentes, metricas

    @staticmethod
    def _puntuar_zona(ubicacion, caja, peso_total, motivos):
        if caja.categoria == 'quimico' or getattr(caja, 'requiere_refrigeracion', False):
            motivos.append('Zona especializada obligatoria')
            return 30
        if caja.es_fragil:
            if ubicacion.tipo_estante == 'fragil':
                motivos.append('Zona protegida para carga frágil')
                return 28
            return 18
        if peso_total >= Decimal('50'):
            if ubicacion.tipo_estante == 'pesado':
                motivos.append('Zona reforzada para peso elevado')
                return 28
            return 15
        if ubicacion.prioridad_categoria == caja.categoria:
            motivos.append('Afinidad de categoría del estante')
            return 24
        if ubicacion.tipo_estante == 'general':
            return 16
        return 9

    @staticmethod
    def _puntuar_ergonomia(ubicacion, caja, peso_total, motivos):
        if peso_total >= Decimal('50'):
            puntos = {1: 20, 2: 10, 3: 2}.get(ubicacion.nivel, 0)
            motivos.append('Carga pesada priorizada cerca del piso')
            return puntos
        if caja.es_fragil:
            puntos = {1: 16, 2: 20, 3: 8}.get(ubicacion.nivel, 4)
            motivos.append('Carga frágil en altura de manipulación controlada')
            return puntos
        if peso_total >= Decimal('20'):
            return {1: 18, 2: 16, 3: 7}.get(ubicacion.nivel, 3)
        if caja.prioridad in ('urgente', 'alta'):
            return {1: 14, 2: 20, 3: 12}.get(ubicacion.nivel, 6)
        return {1: 12, 2: 18, 3: 20}.get(ubicacion.nivel, 8)

    @staticmethod
    def _puntuar_capacidad(uso_peso, uso_volumen, motivos):
        def ajuste(uso, maximo):
            if uso <= 0:
                return maximo // 3
            objetivo = Decimal('0.65')
            diferencia = abs(uso - objetivo)
            return max(0, round(maximo * (1 - min(Decimal('1'), diferencia / Decimal('0.65')))))

        peso = ajuste(uso_peso, 12)
        volumen = ajuste(uso_volumen, 8)
        if Decimal('0.35') <= uso_peso <= Decimal('0.90'):
            motivos.append('Buen aprovechamiento de la capacidad de peso')
        if Decimal('0.30') <= uso_volumen <= Decimal('0.90'):
            motivos.append('Buen aprovechamiento del volumen del casillero')
        return peso + volumen

    @staticmethod
    def _puntuar_accesibilidad(ubicacion, caja, clasificacion, motivos):
        distancia = min(Decimal('20'), Decimal(str(ubicacion.distancia_salida_m)))
        cercania = float((Decimal('20') - distancia) / Decimal('20'))
        prioridad = caja.prioridad
        if prioridad == 'urgente':
            puntos = 15 * cercania
            motivos.append('Prioridad urgente favorece cercanía a salida')
        elif prioridad == 'alta':
            puntos = 12 * cercania + 2
            motivos.append('Alta rotación favorece acceso corto')
        elif prioridad == 'baja':
            puntos = 4 + 6 * (1 - cercania)
        else:
            puntos = 6 + 6 * cercania

        dias = clasificacion.get('dias_para_vencer')
        if dias is not None and dias <= 30:
            puntos = min(15, puntos + 3 * cercania)
            motivos.append('Vencimiento próximo mejora accesibilidad FEFO')
        if ubicacion.lado == 'adelante' and prioridad in ('urgente', 'alta'):
            puntos = min(15, puntos + 1)
        return round(puntos)

    @staticmethod
    def _puntuar_preservacion(ubicacion, caja, peso_total, motivos):
        if ubicacion.tipo_estante == 'pesado' and peso_total < Decimal('30'):
            motivos.append('Penaliza consumo innecesario de zona reforzada')
            return 1
        if ubicacion.tipo_estante == 'fragil' and not caja.es_fragil:
            return 4 if ubicacion.prioridad_categoria == caja.categoria else 1
        if ubicacion.tipo_estante == 'general':
            return 10
        return 8

    @staticmethod
    def ocupar_ubicacion(ubicacion):
        ubicacion.estado_ocupacion = True
        ubicacion.save(update_fields=['estado_ocupacion'])

    @staticmethod
    def liberar_ubicacion(ubicacion):
        ubicacion.estado_ocupacion = False
        ubicacion.save(update_fields=['estado_ocupacion'])
        logger.info('Ubicación %s liberada.', ubicacion)
