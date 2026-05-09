# clasificacion/services/optimizador.py
import logging
from decimal import Decimal

from clasificacion.models import Ubicacion

logger = logging.getLogger('clasificacion')


class OptimizadorUbicaciones:
    """Encuentra la mejor ubicación según reglas logísticas y metadatos del estante."""

    @classmethod
    def encontrar_mejor_ubicacion(cls, clasificacion, caja=None, incluir_detalle=False):
        """
        Busca la ubicación óptima disponible.
        Si `incluir_detalle=True`, retorna (ubicacion, detalle_dict).
        """
        tags = clasificacion.get('tags', []) if isinstance(clasificacion, dict) else []
        prioridad_caja = getattr(caja, 'prioridad', None)
        categoria_caja = getattr(caja, 'categoria', None)
        peso_caja = getattr(caja, 'peso_kg', None)
        es_fragil = bool(getattr(caja, 'es_fragil', False))

        # ── Pre-filtrado en base de datos para reducir candidatos ──────────────
        qs = Ubicacion.objects.filter(estado_ocupacion=False)

        if peso_caja is not None:
            # Excluir ubicaciones donde la capacidad es definitivamente insuficiente
            qs = qs.filter(capacidad_peso_kg__gte=peso_caja)

        if es_fragil:
            qs = qs.filter(permite_fragil=True)

        if categoria_caja == 'quimico':
            qs = qs.filter(permite_quimico=True)

        ubicaciones_candidatas = list(qs)

        if not ubicaciones_candidatas:
            logger.warning(
                "No hay ubicaciones disponibles para caja (peso=%s, frágil=%s, cat=%s).",
                peso_caja, es_fragil, categoria_caja,
            )
            return (None, None) if incluir_detalle else None

        mejor_ubicacion = None
        mejor_puntuacion = -1
        mejor_detalle = None

        for ubi in ubicaciones_candidatas:
            compatible, razones = cls._es_compatible(
                ubicacion=ubi,
                categoria_caja=categoria_caja,
                peso_caja=peso_caja,
                es_fragil=es_fragil,
            )
            if not compatible:
                continue

            puntuacion, motivos = cls._calcular_puntuacion(
                ubicacion=ubi,
                tags=tags,
                prioridad_caja=prioridad_caja,
                categoria_caja=categoria_caja,
                peso_caja=peso_caja,
                es_fragil=es_fragil,
            )

            if puntuacion > mejor_puntuacion:
                mejor_puntuacion = puntuacion
                mejor_ubicacion = ubi
                mejor_detalle = {
                    'score': puntuacion,
                    'motivos': razones + motivos,
                }

        if incluir_detalle:
            return mejor_ubicacion, mejor_detalle
        return mejor_ubicacion

    @staticmethod
    def _es_compatible(ubicacion, categoria_caja, peso_caja, es_fragil):
        razones = []

        if peso_caja is not None and Decimal(str(peso_caja)) > ubicacion.capacidad_peso_kg:
            return False, [f"Supera capacidad del estante ({ubicacion.capacidad_peso_kg}kg)"]

        if es_fragil and not ubicacion.permite_fragil:
            return False, ["El estante no permite carga frágil"]

        if categoria_caja == 'quimico' and not ubicacion.permite_quimico:
            return False, ["El estante no permite químicos"]

        if categoria_caja == 'quimico' and ubicacion.tipo_estante not in ('quimico', 'general'):
            return False, [f"Tipo de estante no apto para químicos ({ubicacion.tipo_estante})"]

        razones.append("Compatibilidad base OK")
        return True, razones

    @classmethod
    def _calcular_puntuacion(cls, ubicacion, tags, prioridad_caja, categoria_caja, peso_caja, es_fragil):
        score = 100
        motivos = []

        # Regla por peso / nivel
        if 'pesado' in tags or (peso_caja is not None and Decimal(str(peso_caja)) >= Decimal('20')):
            if ubicacion.nivel == 1:
                score += 50
                motivos.append("Carga pesada cerca del piso (+50)")
            else:
                penalizacion = 25 * (ubicacion.nivel - 1)
                score -= penalizacion
                motivos.append(f"Carga pesada en nivel alto (-{penalizacion})")

        if 'ligero' in tags:
            if ubicacion.nivel >= 3:
                score += 20
                motivos.append("Carga ligera en nivel alto (+20)")

        # Regla fragilidad
        if 'fragil' in tags or es_fragil:
            if ubicacion.nivel == 2:
                score += 35
                motivos.append("Frágil en nivel medio protegido (+35)")
            if ubicacion.nivel >= 4:
                score -= 40
                motivos.append("Frágil demasiado alto (-40)")
            if ubicacion.tipo_estante == 'fragil':
                score += 30
                motivos.append("Estante especializado en frágil (+30)")

        # Regla urgencia (pasillo cercano a salida=A)
        if prioridad_caja == 'urgente' or 'urgente' in tags:
            if ubicacion.pasillo.upper() == 'A':
                score += 60
                motivos.append("Prioridad urgente en pasillo A (+60)")
            else:
                distancia = ord(ubicacion.pasillo.upper()) - ord('A')
                penalizacion = 10 * max(0, distancia)
                score -= penalizacion
                motivos.append(f"Urgente lejos de salida (-{penalizacion})")

        # Regla categoría preferida del estante
        if categoria_caja and ubicacion.prioridad_categoria == categoria_caja:
            score += 25
            motivos.append("Categoría coincide con prioridad del estante (+25)")
        elif ubicacion.prioridad_categoria == 'sin_preferencia':
            score += 5
            motivos.append("Estante sin preferencia de categoría (+5)")

        # Bonus por uso eficiente de capacidad
        if peso_caja is not None:
            capacidad = Decimal(str(ubicacion.capacidad_peso_kg))
            peso = Decimal(str(peso_caja))
            if capacidad > 0:
                uso = peso / capacidad
                if Decimal('0.40') <= uso <= Decimal('0.90'):
                    score += 10
                    motivos.append("Uso eficiente de capacidad (+10)")

        return max(0, int(score)), motivos

    @staticmethod
    def ocupar_ubicacion(ubicacion):
        ubicacion.estado_ocupacion = True
        ubicacion.save()

    @staticmethod
    def liberar_ubicacion(ubicacion):
        ubicacion.estado_ocupacion = False
        ubicacion.save()
        logger.info("Ubicación %s liberada.", ubicacion)
