import secrets

from django.conf import settings
from rest_framework.permissions import BasePermission


class HasExternalAPIKey(BasePermission):
    """Autoriza integraciones servidor-a-servidor mediante X-API-Key."""

    message = 'API key ausente o inválida.'

    def has_permission(self, request, view):
        configured_key = settings.EXTERNAL_API_KEY
        provided_key = request.headers.get('X-API-Key', '')
        return bool(
            configured_key
            and provided_key
            and secrets.compare_digest(provided_key, configured_key)
        )
