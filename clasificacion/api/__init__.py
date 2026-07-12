"""Vistas de la API p?blica interna, separadas por dominio."""

from .cajas import CajaViewSet
from .catalogo import (
    CategoriaViewSet, DestinoViewSet, HistorialViewSet,
    MedidaViewSet, ProveedorViewSet, UbicacionViewSet, UsuarioViewSet,
    VehiculoViewSet, current_user,
)
from .despachos import DespachoViewSet, PlanillaViewSet, SolicitudDespachoViewSet
from .stock import StockViewSet

__all__ = [
    'CajaViewSet', 'UbicacionViewSet', 'MedidaViewSet', 'ProveedorViewSet',
    'UsuarioViewSet', 'HistorialViewSet', 'DespachoViewSet',
    'CategoriaViewSet',
    'VehiculoViewSet', 'DestinoViewSet', 'SolicitudDespachoViewSet',
    'PlanillaViewSet', 'StockViewSet', 'current_user',
]
