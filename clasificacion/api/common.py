# clasificacion/views.py
import logging
import io
import datetime
import math
from collections import Counter
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from ..models import (
    Caja, Ubicacion, Medida, Proveedor, Usuario,
    HistorialMovimientos, Despacho, Categoria,
    Vehiculo, Destino, SolicitudDespacho, Planilla
)
from ..serializers import (
    CajaSerializer, UbicacionSerializer, MedidaSerializer,
    ProveedorSerializer, UsuarioSerializer, HistorialSerializer,
    DespachoSerializer, CategoriaSerializer,
    VehiculoSerializer, DestinoSerializer, SolicitudDespachoSerializer, PlanillaSerializer
)
from ..services import ClasificadorCajas, OptimizadorUbicaciones
from ..services.ruta_service import RutaService

logger = logging.getLogger('clasificacion')


# ── Helpers ───────────────────────────────────────────────────────────────────

def _registrar_historial(caja, estado_anterior, usuario_id):
    if not usuario_id:
        logger.warning("Movimiento de caja %s sin usuario.", caja.id)
        return
    try:
        usuario = Usuario.objects.get(id_usuario=usuario_id)
        HistorialMovimientos.objects.create(
            id_caja=caja, id_usuario=usuario,
            estado_anterior=estado_anterior, estado_nuevo=caja.estado,
        )
    except Usuario.DoesNotExist:
        logger.error("Usuario id=%s no encontrado para caja %s.", usuario_id, caja.id)



# ── WarehouseMap Custom Flowable for ReportLab ──────────────────────────────
