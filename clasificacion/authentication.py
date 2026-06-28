from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

MOBILE_TOKEN_SALT = 'logismart.mobile.auth'
MOBILE_TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60

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
