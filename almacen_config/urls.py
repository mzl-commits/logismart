from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from clasificacion.views_frontend import (
    dashboard, almacen_visual, nueva_caja, configuracion,
    despachos, administracion, login_view, logout_view,
    planillas_historial, ver_pdf_lote, spa_app
)
from clasificacion.views_subscription import (
    suscripcion_view, crear_checkout_session, solicitar_cotizacion, stripe_webhook
)

urlpatterns = [
    path('', spa_app, name='dashboard'),
    path('almacen/', spa_app, name='almacen_visual'),
    path('nueva-caja/', spa_app, name='nueva_caja'),
    path('cajas/', spa_app),
    path('configuracion/', spa_app, name='configuracion'),
    path('despachos/', spa_app, name='despachos'),
    path('administracion/', spa_app, name='administracion'),
    path('planillas/', spa_app, name='planillas_historial'),
    path('ver-pdf-lote/', ver_pdf_lote, name='ver_pdf_lote'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('suscripcion/', suscripcion_view, name='suscripcion'),
    path('suscripcion/checkout/', crear_checkout_session, name='checkout'),
    path('suscripcion/cotizacion/', solicitar_cotizacion, name='cotizacion'),
    path('suscripcion/webhook/', stripe_webhook, name='stripe_webhook'),
    path('admin/', admin.site.urls),
    path('api/', include('clasificacion.urls')),
    path('api/v1/', include('clasificacion.urls_v1')),   # Adaptador equipo externo
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
