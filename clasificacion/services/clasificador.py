from decimal import Decimal

from django.utils import timezone


class ClasificadorCajas:
    """Normaliza las variables operativas que usa el motor de slotting."""
    
    @staticmethod
    def clasificar_peso(peso_kg):
        peso = float(peso_kg)
        if peso <= 5:
            return 'ligero'
        elif peso <= 20:
            return 'normal'
        else:
            return 'pesado'
    
    @classmethod
    def clasificar(cls, caja):
        cantidad = max(1, int(caja.cantidad or 1))
        peso_unitario = Decimal(str(caja.peso_kg or 0))
        peso_total = peso_unitario * cantidad
        medida = getattr(caja, 'id_medida', None)
        dimensiones = {
            'largo_cm': float(medida.largo) if medida else 0,
            'ancho_cm': float(medida.ancho) if medida else 0,
            'alto_cm': float(medida.alto) if medida else 0,
        }
        volumen = Decimal(str(medida.volumen)) if medida else Decimal('0')
        dias_para_vencer = None
        if caja.fecha_vencimiento:
            dias_para_vencer = (caja.fecha_vencimiento - timezone.localdate()).days

        clasificacion = {
            'peso_categoria': cls.clasificar_peso(peso_total),
            'peso_unitario_kg': float(peso_unitario),
            'peso_total_kg': float(peso_total),
            'cantidad': cantidad,
            'dimensiones': dimensiones,
            'volumen_cm3': float(volumen),
            'es_fragil': caja.es_fragil,
            'requiere_refrigeracion': bool(getattr(caja, 'requiere_refrigeracion', False)),
            'prioridad_nivel': caja.prioridad,
            'categoria': caja.categoria,
            'dias_para_vencer': dias_para_vencer,
            'tags': []
        }
        
        # Generar tags
        if clasificacion['peso_categoria'] == 'pesado':
            clasificacion['tags'].append('pesado')
        if clasificacion['peso_categoria'] == 'ligero':
            clasificacion['tags'].append('ligero')
        if caja.es_fragil:
            clasificacion['tags'].append('fragil')
        if caja.prioridad in ['alta', 'urgente']:
            clasificacion['tags'].append('urgente')
        if clasificacion['requiere_refrigeracion']:
            clasificacion['tags'].append('cadena_frio')
        if dias_para_vencer is not None and dias_para_vencer <= 30:
            clasificacion['tags'].append('vencimiento_proximo')
        
        return clasificacion
