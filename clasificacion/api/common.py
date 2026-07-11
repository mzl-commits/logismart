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
    HistorialMovimientos, Despacho, EstadoCarro, Categoria, ConfigCarro,
    Vehiculo, Destino, SolicitudDespacho, Planilla
)
from ..serializers import (
    CajaSerializer, UbicacionSerializer, MedidaSerializer,
    ProveedorSerializer, UsuarioSerializer, HistorialSerializer,
    DespachoSerializer, EstadoCarroSerializer, CategoriaSerializer, ConfigCarroSerializer,
    VehiculoSerializer, DestinoSerializer, SolicitudDespachoSerializer, PlanillaSerializer
)
from ..services import ClasificadorCajas, OptimizadorUbicaciones, ESP32Service
from ..services.ruta_service import RutaService

logger = logging.getLogger('clasificacion')

_CARRO_DEFAULTS = {
    'pos_x': 0, 'pos_y': 0,
    'destino_x': 0, 'destino_y': 0,
    'ruta': [], 'estado': 'esperando',
    'paradas': [], 'parada_actual': 0,
    'sensor_opt_izq_ext': False,
    'sensor_opt_izq_int': False,
    'sensor_opt_der_int': False,
    'sensor_opt_der_ext': False,
    'sensor_obstaculo_frontal': False,
    'sensor_obstaculo_trasero': False,
    'motor_izq_vel': 1500,
    'motor_der_vel': 1500,
}

def _publicar_mqtt_comando(payload):
    import paho.mqtt.publish as publish
    import json
    from django.conf import settings
    try:
        mqtt_cfg = settings.MQTT_CONFIG
        auth = None
        if mqtt_cfg['USER'] and mqtt_cfg['PASS']:
            auth = {'username': mqtt_cfg['USER'], 'password': mqtt_cfg['PASS']}
        
        publish.single(
            mqtt_cfg['TOPIC_COMANDO'],
            payload=json.dumps(payload),
            hostname=mqtt_cfg['BROKER'],
            port=mqtt_cfg['PORT'],
            auth=auth
        )
        logger.info("Publicado comando MQTT a %s: %s", mqtt_cfg['TOPIC_COMANDO'], payload)
    except Exception as e:
        logger.error("Error al publicar comando MQTT: %s", e)



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


def _get_or_create_carro(carro_id=1):
    carro, _ = EstadoCarro.objects.get_or_create(id=carro_id, defaults=_CARRO_DEFAULTS)
    return carro


def _enviar_esp32(x, y, caja_id=None, carro_id=1, publish_mqtt=True):
    esp32 = ESP32Service()
    resultado = esp32.enviar_coordenadas(x, y)
    esp32.cerrar()

    if publish_mqtt:
        try:
            from clasificacion.services.ruta_service import RutaService
            carro = EstadoCarro.objects.filter(id=carro_id).first()
            pos_x = carro.pos_x if carro else 0
            pos_y = carro.pos_y if carro else 0
            ruta = RutaService.generar_ruta(pos_x, pos_y, int(x), int(y))
            
            _publicar_mqtt_comando({
                'action': 'mover',
                'destino_x': int(x),
                'destino_y': int(y),
                'ruta': ruta,
                'caja_id': caja_id,
                'carro_id': carro_id
            })
        except Exception as e:
            logger.error("Error al publicar comando MQTT en _enviar_esp32: %s", e)
            
    return resultado



# ── WarehouseMap Custom Flowable for ReportLab ──────────────────────────────
