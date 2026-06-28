# clasificacion/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CajaViewSet, UbicacionViewSet, MedidaViewSet,
    ProveedorViewSet, UsuarioViewSet, HistorialViewSet,
    DespachoViewSet, EstadoCarroViewSet, CategoriaViewSet, ConfigCarroViewSet,
    VehiculoViewSet, DestinoViewSet, SolicitudDespachoViewSet,
    current_user
)
from .views_mobile import MobileDashboardView, MobileLoginView

router = DefaultRouter()
router.register(r'cajas', CajaViewSet, basename='caja')
router.register(r'ubicaciones', UbicacionViewSet)
router.register(r'medidas', MedidaViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'historial', HistorialViewSet)
router.register(r'despachos', DespachoViewSet)
router.register(r'carro', EstadoCarroViewSet, basename='carro')
router.register(r'estado-carro', EstadoCarroViewSet, basename='estado-carro')
router.register(r'categorias', CategoriaViewSet)
router.register(r'config-carro', ConfigCarroViewSet, basename='config-carro')
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'destinos', DestinoViewSet)
router.register(r'solicitudes-despacho', SolicitudDespachoViewSet, basename='solicitudes-despacho')

urlpatterns = [
    path('me/', current_user),
    path('mobile/login/', MobileLoginView.as_view(), name='mobile-login'),
    path('mobile/dashboard/', MobileDashboardView.as_view(), name='mobile-dashboard'),
    path('', include(router.urls)),
]
