"""API mínima y aislada para la aplicación Android LogiSmart Mobile."""

from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework import status
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Caja, Despacho, EstadoCarro, Ubicacion


from .authentication import (
    MobileTokenAuthentication,
    MOBILE_TOKEN_SALT,
    MOBILE_TOKEN_MAX_AGE_SECONDS
)


def create_mobile_token(username):
    """Crea un token firmado y fechado sin persistir credenciales."""
    return signing.dumps(
        {'username': username},
        salt=MOBILE_TOKEN_SALT,
        compress=True,
    )


class MobileLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        password = str(request.data.get('password', ''))

        if not username or not password:
            return Response(
                {'detail': 'Usuario y contraseña son obligatorios'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request, username=username, password=password)
        if user is None or not user.is_active:
            return Response(
                {'detail': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response({
            'token': create_mobile_token(user.get_username()),
            'username': user.get_username(),
            'full_name': user.get_full_name() or user.get_username(),
        })


class MobileDashboardView(APIView):
    authentication_classes = [MobileTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Planilla
        planillas_count = Planilla.objects.filter(operador=request.user).count()

        return Response({
            'pending_boxes': Caja.objects.filter(estado='pendiente').count(),
            'completed_dispatches': Despacho.objects.count(),
            'planillas_count': planillas_count,
            'quick_actions': ['Ver planillas', 'Cerrar sesión'],
        })


class MobilePlanillasView(APIView):
    authentication_classes = [MobileTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Planilla
        planillas = Planilla.objects.filter(operador=request.user).order_by('-fecha_creacion')
        
        data = []
        for p in planillas:
            cajas = Caja.objects.filter(id__in=p.cajas_ids).select_related('id_ubicacion')
            cajas_detalles = [{
                'id': c.id,
                'producto': c.producto,
                'estado': c.get_estado_display(),
                'prioridad': c.get_prioridad_display(),
                'categoria': c.categoria,
                'ubicacion': str(c.id_ubicacion) if c.id_ubicacion else 'No asignada'
            } for c in cajas]
            
            cajas_ids_str = ",".join(p.cajas_ids)
            pdf_url = f"/api/cajas/descargar_pdf_lote/?cajas={cajas_ids_str}&usuario_id={request.user.id}"
            
            data.append({
                'id_planilla': p.id_planilla,
                'fecha_creacion': p.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
                'total_cajas': len(p.cajas_ids),
                'operador_id': p.operador.id,
                'pdf_url': pdf_url,
                'cajas': cajas_detalles
            })
            
        return Response(data)


class MobileEstantesView(APIView):
    """Devuelve los estantes del almacén con ocupación real, agrupados por pasillo-estante."""
    authentication_classes = [MobileTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from itertools import groupby

        ubicaciones = Ubicacion.objects.all().order_by('pasillo', 'estante')

        # Agrupar por pasillo + estante
        grupos = {}
        for ub in ubicaciones:
            key = (ub.pasillo, ub.estante)
            if key not in grupos:
                grupos[key] = []
            grupos[key].append(ub)

        data = []
        for idx, ((pasillo, estante_num), slots) in enumerate(sorted(grupos.items()), start=1):
            total_slots = len(slots)
            slots_ocupados = sum(1 for s in slots if s.estado_ocupacion)
            # Cajas activas asignadas a alguna de estas ubicaciones
            cajas_asignadas = Caja.objects.filter(
                id_ubicacion__in=[s.pk for s in slots],
                estado__in=['en_almacen', 'procesada']
            ).count()

            # Porcentaje de ocupación de slots físicos
            ocupacion_pct = round((slots_ocupados / total_slots) * 100) if total_slots > 0 else 0

            # Estado legible
            if ocupacion_pct >= 90:
                estado = 'Lleno'
            elif ocupacion_pct >= 50:
                estado = 'Ocupado'
            elif ocupacion_pct > 0:
                estado = 'Parcial'
            else:
                estado = 'Disponible'

            data.append({
                'id': idx,
                'name': f'Pasillo {pasillo} - Estante {estante_num:02d}',
                'capacity': total_slots,
                'current_occupation': slots_ocupados,
                'assigned_boxes': cajas_asignadas,
                'occupation_pct': ocupacion_pct,
                'status': estado,
                'tipo_estante': slots[0].get_tipo_estante_display() if slots else 'General',
            })

        return Response(data)
