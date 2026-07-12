import secrets

from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class HasExternalAPIKey(BasePermission):
    """Autoriza integraciones servidor-a-servidor mediante X-API-Key."""

    message = 'API key ausente o inválida.'

    def has_permission(self, request, view):
        configured_key = getattr(settings, 'EXTERNAL_API_KEY', '')
        provided_key = request.headers.get('X-API-Key', '')
        return bool(
            configured_key
            and provided_key
            and secrets.compare_digest(provided_key, configured_key)
        )


class IsAdminOrReadOnly(BasePermission):
    """Permite lectura a usuarios autenticados y cambios solo a administradores."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or bool(request.user and request.user.is_staff)
