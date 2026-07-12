# clasificacion/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    CajaViewSet, UbicacionViewSet, MedidaViewSet,
    ProveedorViewSet, UsuarioViewSet, HistorialViewSet,
    DespachoViewSet, CategoriaViewSet,
    VehiculoViewSet, DestinoViewSet, SolicitudDespachoViewSet,
    current_user, PlanillaViewSet, StockViewSet
)
from .views_mobile import MobileDashboardView, MobileLoginView, MobilePlanillasView, MobileEstantesView, MobileCompletarPlanillaView
from .views_inventory import InventoryViewSet, ProductViewSet, ReservationViewSet, StockPolicyViewSet

router = DefaultRouter()
router.register(r'cajas', CajaViewSet, basename='caja')
router.register(r'ubicaciones', UbicacionViewSet)
router.register(r'medidas', MedidaViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'historial', HistorialViewSet)
router.register(r'despachos', DespachoViewSet)
router.register(r'categorias', CategoriaViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'destinos', DestinoViewSet)
router.register(r'solicitudes-despacho', SolicitudDespachoViewSet, basename='solicitudes-despacho')
router.register(r'planillas', PlanillaViewSet, basename='planilla')
router.register(r'stock', StockViewSet, basename='stock')
router.register(r'inventario', InventoryViewSet, basename='inventario')
router.register(r'reservas-stock', ReservationViewSet, basename='reserva-stock')
router.register(r'politicas-stock', StockPolicyViewSet, basename='politica-stock')
router.register(r'productos', ProductViewSet, basename='producto')

urlpatterns = [
    path('me/', current_user),
    path('mobile/login/', MobileLoginView.as_view(), name='mobile-login'),
    path('mobile/dashboard/', MobileDashboardView.as_view(), name='mobile-dashboard'),
    path('mobile/planillas/', MobilePlanillasView.as_view(), name='mobile-planillas'),
    path('mobile/planillas/<int:pk>/completar/', MobileCompletarPlanillaView.as_view(), name='mobile-planilla-completar'),
    path('mobile/estantes/', MobileEstantesView.as_view(), name='mobile-estantes'),
    path('', include(router.urls)),
]
