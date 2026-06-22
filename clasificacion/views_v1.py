# clasificacion/views_v1.py
"""
Adaptador API v1 — compatibilidad con el equipo externo de stock.

Traduce el vocabulario del equipo externo al formato interno de LogiSmart:
  - Estados: LLEGANDO → pendiente, INGRESANDO → en_transito,
             EN_ALMACEN → almacenada, DESPACHADO → despachada
  - Prioridades: ALTA → alta, MEDIA → media, BAJA → baja
  - Campos FK opcionales: usa defaults cuando no se envían
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .models import Caja, Medida, Proveedor

logger = logging.getLogger('clasificacion')

# ── Mapas de traducción ────────────────────────────────────────────────────────

ESTADO_MAP = {
    'LLEGANDO':   'pendiente',
    'INGRESANDO': 'en_transito',
    'EN_ALMACEN': 'almacenada',
    'DESPACHADO': 'despachada',
    # también acepta los valores internos directamente (por si acaso)
    'pendiente':   'pendiente',
    'en_transito': 'en_transito',
    'almacenada':  'almacenada',
    'despachada':  'despachada',
    'clasificada': 'clasificada',
}

PRIORIDAD_MAP = {
    'ALTA':    'alta',
    'MEDIA':   'media',
    'BAJA':    'baja',
    'URGENTE': 'urgente',
    # también acepta los valores internos directamente
    'alta':    'alta',
    'media':   'media',
    'baja':    'baja',
    'urgente': 'urgente',
}


def _medida_default():
    """Devuelve la primera medida disponible o None."""
    return Medida.objects.order_by('id_medida').first()


def _proveedor_default():
    """Devuelve el primer proveedor disponible o None."""
    return Proveedor.objects.order_by('id_proveedor').first()


# ── Endpoint: GET + POST /api/v1/cajas ────────────────────────────────────────

class CajaV1ListView(APIView):
    """
    GET  /api/v1/cajas  → Lista todas las cajas (formato simplificado)
    POST /api/v1/cajas  → Registra una nueva caja desde el equipo externo
    """
    permission_classes = [AllowAny]  # CORS abierto, sin sesión requerida

    def get(self, request):
        cajas = Caja.objects.exclude(estado='despachada').select_related(
            'id_medida', 'id_proveedor', 'id_ubicacion'
        ).order_by('-hora_llegada')

        data = []
        for c in cajas:
            data.append({
                'id': c.id,
                'producto': c.producto,
                'cantidad': c.cantidad,
                'peso_kg': float(c.peso_kg) if c.peso_kg else None,
                'prioridad': c.prioridad.upper(),   # responde en UPPER para el equipo externo
                'categoria': c.categoria,
                'es_fragil': c.es_fragil,
                'estado_envio': _to_upper_estado(c.estado),
                'estado_interno': c.estado,
                'ubicacion': str(c.id_ubicacion) if c.id_ubicacion else None,
                'proveedor': c.id_proveedor.nombre_empresa if c.id_proveedor else None,
                'medida': str(c.id_medida) if c.id_medida else None,
                'hora_llegada': c.hora_llegada.isoformat(),
            })

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data

        # ── Validación de campos obligatorios ──────────────────────────────────
        caja_id = data.get('id', '').strip()
        producto = data.get('producto', '').strip()
        cantidad = data.get('cantidad')

        errors = {}
        if not caja_id:
            errors['id'] = 'El campo id es obligatorio.'
        if not producto:
            errors['producto'] = 'El campo producto es obligatorio.'
        if cantidad is None:
            errors['cantidad'] = 'El campo cantidad es obligatorio.'
        if errors:
            return Response({'errores': errors}, status=status.HTTP_400_BAD_REQUEST)

        # ── Verificar que no exista ya ─────────────────────────────────────────
        if Caja.objects.filter(id=caja_id).exists():
            return Response(
                {'error': f'Ya existe una caja con id "{caja_id}".'},
                status=status.HTTP_409_CONFLICT
            )

        # ── Traducir prioridad ─────────────────────────────────────────────────
        prioridad_raw = data.get('prioridad', 'MEDIA')
        prioridad = PRIORIDAD_MAP.get(str(prioridad_raw).upper(), 'media')

        # ── Traducir estado inicial ────────────────────────────────────────────
        estado_raw = data.get('estado_envio', 'LLEGANDO')
        estado = ESTADO_MAP.get(str(estado_raw).upper(), 'pendiente')

        # ── Resolver medida ────────────────────────────────────────────────────
        id_medida_raw = data.get('id_medida')
        medida = None
        if id_medida_raw is not None:
            try:
                medida = Medida.objects.get(id_medida=int(id_medida_raw))
            except (Medida.DoesNotExist, ValueError, TypeError):
                return Response(
                    {'error': f'No existe una medida con id_medida={id_medida_raw}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            medida = _medida_default()
            if not medida:
                return Response(
                    {'error': 'No hay medidas registradas en el sistema. Registra al menos una medida primero.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ── Resolver proveedor ─────────────────────────────────────────────────
        id_proveedor_raw = data.get('id_proveedor')
        proveedor = None
        if id_proveedor_raw is not None:
            try:
                proveedor = Proveedor.objects.get(id_proveedor=int(id_proveedor_raw))
            except (Proveedor.DoesNotExist, ValueError, TypeError):
                return Response(
                    {'error': f'No existe un proveedor con id_proveedor={id_proveedor_raw}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            proveedor = _proveedor_default()
            if not proveedor:
                return Response(
                    {'error': 'No hay proveedores registrados en el sistema. Registra al menos uno primero.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ── Crear la caja ──────────────────────────────────────────────────────
        try:
            caja = Caja.objects.create(
                id=caja_id,
                producto=producto,
                cantidad=int(cantidad),
                id_medida=medida,
                id_proveedor=proveedor,
                peso_kg=data.get('peso_kg') or 0,
                prioridad=prioridad,
                categoria=data.get('categoria', 'otro').lower()[:30],
                es_fragil=bool(data.get('es_fragil', False)),
                estado=estado,
            )
        except Exception as e:
            logger.error('Error creando caja v1: %s | data=%s', e, data)
            return Response(
                {'error': 'Error interno al crear la caja.', 'detalle': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        logger.info('Caja creada via API v1: %s (proveedor=%s, medida=%s)', caja.id, proveedor, medida)

        return Response({
            'ok': True,
            'id': caja.id,
            'producto': caja.producto,
            'cantidad': caja.cantidad,
            'estado_envio': _to_upper_estado(caja.estado),
            'estado_interno': caja.estado,
            'prioridad': caja.prioridad.upper(),
            'medida_asignada': str(medida),
            'proveedor_asignado': proveedor.nombre_empresa,
            'mensaje': f'Caja "{caja.id}" registrada correctamente. Lista para clasificación en LogiSmart.',
        }, status=status.HTTP_201_CREATED)


def _to_upper_estado(estado_interno):
    """Convierte estado interno a vocabulario del equipo externo."""
    _map = {
        'pendiente':   'LLEGANDO',
        'clasificada': 'LLEGANDO',
        'en_transito': 'INGRESANDO',
        'almacenada':  'EN_ALMACEN',
        'despachada':  'DESPACHADO',
    }
    return _map.get(estado_interno, estado_interno.upper())
