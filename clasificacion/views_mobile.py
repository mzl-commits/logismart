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


MOBILE_TOKEN_SALT = 'logismart.mobile.auth'
MOBILE_TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60


def create_mobile_token(username):
    """Crea un token firmado y fechado sin persistir credenciales."""
    return signing.dumps(
        {'username': username},
        salt=MOBILE_TOKEN_SALT,
        compress=True,
    )


class MobileTokenAuthentication(BaseAuthentication):
    """Valida tokens Bearer firmados y aplica su tiempo máximo de vida."""

    def authenticate(self, request):
        authorization = request.headers.get('Authorization', '')
        scheme, _, token = authorization.partition(' ')
        if scheme.lower() != 'bearer' or not token:
            return None

        try:
            payload = signing.loads(
                token,
                salt=MOBILE_TOKEN_SALT,
                max_age=MOBILE_TOKEN_MAX_AGE_SECONDS,
            )
            user = get_user_model().objects.get(
                username=payload['username'],
                is_active=True,
            )
        except (
            signing.BadSignature,
            signing.SignatureExpired,
            KeyError,
            get_user_model().DoesNotExist,
        ) as exc:
            raise AuthenticationFailed('Token inválido o expirado') from exc

        return user, token

    def authenticate_header(self, request):
        return 'Bearer'


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
        carro = EstadoCarro.objects.order_by('id').first()
        status_labels = {
            'esperando': 'Operativo',
            'moviendo': 'En movimiento',
            'llego': 'En destino',
            'regresando': 'Regresando',
        }
        car_status = status_labels.get(
            getattr(carro, 'estado', None),
            'Sin conexión',
        )

        active_alerts = 0
        if carro:
            # Estos campos son opcionales para mantener compatibilidad con
            # instalaciones donde la telemetría avanzada aún no fue migrada.
            active_alerts += int(getattr(carro, 'sensor_obstaculo_frontal', False))
            active_alerts += int(getattr(carro, 'sensor_obstaculo_trasero', False))
            active_alerts += int(getattr(carro, 'bateria_pct', 100) < 20)

        return Response({
            'car_status': car_status,
            'active_alerts': active_alerts,
            'pending_boxes': Caja.objects.filter(estado='pendiente').count(),
            'completed_dispatches': Despacho.objects.count(),
            'quick_actions': ['Ver estado', 'Alertas', 'Cerrar sesión'],
        })
