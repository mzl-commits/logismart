"""Compatibilidad para imports hist?ricos de ``clasificacion.views``.

Las implementaciones viven en :mod:`clasificacion.api`, separadas por dominio.
Los consumidores nuevos deben importar directamente desde ese paquete.
"""

from .api import *  # noqa: F401,F403
