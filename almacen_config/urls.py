from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from clasificacion.views_frontend import dashboard, almacen_visual, nueva_caja, configuracion, despachos, administracion

urlpatterns = [
    path('', dashboard, name='dashboard'),
    path('almacen/', almacen_visual, name='almacen_visual'),
    path('nueva-caja/', nueva_caja, name='nueva_caja'),
    path('configuracion/', configuracion, name='configuracion'),
    path('despachos/', despachos, name='despachos'),
    path('administracion/', administracion, name='administracion'),
    path('admin/', admin.site.urls),
    path('api/', include('clasificacion.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]