# clasificacion/urls_v1.py
"""
Rutas de la API v1 — adaptador para el equipo externo de stock.
Prefijo: /api/v1/
"""
from django.urls import path
from .views_v1 import CajaV1ListView, CajaV1EstadoView, DespachoV1CreateView

urlpatterns = [
    path('cajas', CajaV1ListView.as_view(), name='v1-cajas'),
    path('cajas/<str:id_caja>/estado', CajaV1EstadoView.as_view(), name='v1-caja-estado'),
    path('despachos', DespachoV1CreateView.as_view(), name='v1-despachos'),
]
