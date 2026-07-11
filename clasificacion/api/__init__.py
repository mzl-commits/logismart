"""Vistas de la API p?blica interna, separadas por dominio."""

from .agv import EstadoCarroViewSet
from .cajas import CajaViewSet
from .catalogo import (
    CategoriaViewSet, ConfigCarroViewSet, DestinoViewSet, HistorialViewSet,
    MedidaViewSet, ProveedorViewSet, UbicacionViewSet, UsuarioViewSet,
    VehiculoViewSet, current_user,
)
from .despachos import DespachoViewSet, PlanillaViewSet, SolicitudDespachoViewSet
from .stock import StockViewSet

__all__ = [
    'CajaViewSet', 'UbicacionViewSet', 'MedidaViewSet', 'ProveedorViewSet',
    'UsuarioViewSet', 'HistorialViewSet', 'DespachoViewSet',
    'EstadoCarroViewSet', 'CategoriaViewSet', 'ConfigCarroViewSet',
    'VehiculoViewSet', 'DestinoViewSet', 'SolicitudDespachoViewSet',
    'PlanillaViewSet', 'StockViewSet', 'current_user',
]
