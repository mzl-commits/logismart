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

from .models import Caja, Medida, Proveedor, Ubicacion, Usuario, HistorialMovimientos, Despacho

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


# ── Endpoint: PATCH /api/v1/cajas/{id_caja}/estado ─────────────────────────────

class CajaV1EstadoView(APIView):
    """
    PATCH /api/v1/cajas/{id_caja}/estado → Actualiza el estado y ubicación de una caja
    """
    permission_classes = [AllowAny]

    def patch(self, request, id_caja):
        try:
            caja = Caja.objects.get(id=id_caja)
        except Caja.DoesNotExist:
            return Response({'error': f'No existe una caja con id "{id_caja}".'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        estado_raw = data.get('estado_nuevo')
        id_ubicacion_raw = data.get('id_ubicacion')
        usuario_id = data.get('id_usuario')

        if not estado_raw:
            return Response({'error': 'El campo estado_nuevo es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        estado_nuevo = ESTADO_MAP.get(str(estado_raw).upper())
        if not estado_nuevo:
            return Response({'error': f'Estado "{estado_raw}" no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

        if usuario_id:
            try:
                Usuario.objects.get(id_usuario=usuario_id)
            except Usuario.DoesNotExist:
                return Response({'error': f'No existe un usuario con id_usuario={usuario_id}.'}, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = caja.estado
        ubicacion_anterior = caja.id_ubicacion

        # Resolver ubicacion
        ubicacion_nueva = None
        if id_ubicacion_raw is not None:
            try:
                ubicacion_nueva = Ubicacion.objects.get(id_ubicacion=int(id_ubicacion_raw))
            except (Ubicacion.DoesNotExist, ValueError, TypeError):
                return Response({'error': f'No existe una ubicación con id_ubicacion={id_ubicacion_raw}.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        from .services.optimizador import OptimizadorUbicaciones

        try:
            with transaction.atomic():
                caja.estado = estado_nuevo

                if estado_nuevo == 'despachada':
                    caja.id_ubicacion = None
                    if ubicacion_anterior:
                        OptimizadorUbicaciones.liberar_ubicacion(ubicacion_anterior)
                else:
                    if ubicacion_nueva:
                        caja.id_ubicacion = ubicacion_nueva
                        OptimizadorUbicaciones.ocupar_ubicacion(ubicacion_nueva)
                        if ubicacion_anterior and ubicacion_anterior != ubicacion_nueva:
                            OptimizadorUbicaciones.liberar_ubicacion(ubicacion_anterior)

                caja.save()
                if usuario_id:
                    _registrar_historial(caja, estado_anterior, usuario_id)

        except Exception as e:
            logger.error('Error al actualizar estado caja v1: %s', e)
            return Response({'error': 'Error interno al actualizar estado.', 'detalle': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'ok': True,
            'id': caja.id,
            'estado_nuevo': _to_upper_estado(caja.estado),
            'estado_interno': caja.estado,
            'ubicacion': str(caja.id_ubicacion) if caja.id_ubicacion else None,
            'mensaje': 'Estado de caja actualizado correctamente.'
        }, status=status.HTTP_200_OK)


# ── Endpoint: POST /api/v1/despachos ───────────────────────────────────────────

class DespachoV1CreateView(APIView):
    """
    POST /api/v1/despachos → Procesa el despacho y salida definitiva de una caja
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        caja_id = data.get('id_caja', '').strip()
        destino = data.get('destino', '').strip()
        placa = data.get('transporte_placa', '').strip()
        usuario_id = data.get('id_usuario_despacho')

        if not caja_id:
            return Response({'error': 'El campo id_caja es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            caja = Caja.objects.get(id=caja_id)
        except Caja.DoesNotExist:
            return Response({'error': f'No existe una caja con id "{caja_id}".'}, status=status.HTTP_404_NOT_FOUND)

        usuario = None
        if usuario_id:
            try:
                usuario = Usuario.objects.get(id_usuario=usuario_id)
            except Usuario.DoesNotExist:
                return Response({'error': f'No existe un usuario con id_usuario={usuario_id}.'}, status=status.HTTP_400_BAD_REQUEST)

        if caja.estado == 'despachada':
            return Response({'error': 'La caja ya ha sido despachada previamente.'}, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = caja.estado
        ubicacion_anterior = caja.id_ubicacion

        from django.db import transaction
        from .services.optimizador import OptimizadorUbicaciones

        try:
            with transaction.atomic():
                caja.estado = 'despachada'
                caja.id_ubicacion = None
                caja.save()

                if ubicacion_anterior:
                    OptimizadorUbicaciones.liberar_ubicacion(ubicacion_anterior)

                if usuario:
                    _registrar_historial(caja, estado_anterior, usuario.id_usuario)

                despacho = Despacho.objects.create(
                    id_caja=caja,
                    id_usuario_despacho=usuario,
                    destino=destino or 'No especificado',
                    transporte_placa=placa or 'N/A'
                )
        except Exception as e:
            logger.error('Error al registrar despacho v1: %s', e)
            return Response({'error': 'Error interno al registrar el despacho.', 'detalle': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'ok': True,
            'id_despacho': despacho.id,
            'id_caja': caja.id,
            'destino': despacho.destino,
            'transporte_placa': despacho.transporte_placa,
            'estado_caja': 'DESPACHADO',
            'mensaje': 'Despacho registrado y procesado correctamente.'
        }, status=status.HTTP_201_CREATED)


def _registrar_historial(caja, estado_anterior, usuario_id):
    """Registra el cambio de estado en el historial de movimientos."""
    if not usuario_id:
        return
    try:
        usuario = Usuario.objects.get(id_usuario=usuario_id)
        HistorialMovimientos.objects.create(
            id_caja=caja, id_usuario=usuario,
            estado_anterior=estado_anterior, estado_nuevo=caja.estado,
        )
    except Exception as e:
        logger.error('Error al registrar historial en v1: %s', e)

