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

from .models import Caja, Despacho, EstadoCarro


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
