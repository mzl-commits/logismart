# clasificacion/views.py
import logging
import io
import datetime
import math
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from .models import (
    Caja, Ubicacion, Medida, Proveedor, Usuario,
    HistorialMovimientos, Despacho, EstadoCarro, Categoria, ConfigCarro,
    Vehiculo, Destino, SolicitudDespacho
)
from .serializers import (
    CajaSerializer, UbicacionSerializer, MedidaSerializer,
    ProveedorSerializer, UsuarioSerializer, HistorialSerializer,
    DespachoSerializer, EstadoCarroSerializer, CategoriaSerializer, ConfigCarroSerializer,
    VehiculoSerializer, DestinoSerializer, SolicitudDespachoSerializer
)

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class DestinoViewSet(viewsets.ModelViewSet):
    queryset = Destino.objects.all()
    serializer_class = DestinoSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer


from .services import ClasificadorCajas, OptimizadorUbicaciones, ESP32Service
from .services.ruta_service import RutaService

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

class WarehouseMap(Flowable):
    def __init__(self, paradas, base_x=1, base_y=0, width=540, height=220):
        super().__init__()
        self.paradas = paradas
        self.base_x = base_x
        self.base_y = base_y
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        # Fondo claro
        canvas.setFillColor(colors.HexColor("#f8fafc"))
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.rect(0, 0, self.width, self.height, fill=1, stroke=1)

        margin_x = 55
        margin_y = 40
        grid_w = self.width - 2 * margin_x
        grid_h = self.height - 2 * margin_y

        scale_x = grid_w / 2.0
        scale_y = grid_h / 3.0

        def to_canvas(gx, gy):
            cx = margin_x + gx * scale_x
            cy = margin_y + gy * scale_y
            return cx, cy

        # Dibujar la Avenida Central (vertical en x = 1)
        cx_av, cy_start = to_canvas(1, 0)
        _, cy_end = to_canvas(1, 3)
        canvas.setStrokeColor(colors.HexColor("#94a3b8")) # slate-400
        canvas.setLineWidth(3)
        canvas.line(cx_av, cy_start, cx_av, cy_end)
        
        # Etiqueta de la Avenida Central (debajo)
        canvas.setFillColor(colors.HexColor("#475569"))
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(cx_av, 15, "Avenida Central")

        # Dibujar pasillos horizontales (y = 0, 1, 2, 3)
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.setLineWidth(1)
        for y in range(4):
            cx_start, cy = to_canvas(0, y)
            cx_end, _ = to_canvas(2, cy)
            canvas.line(cx_start, cy, cx_end, cy)
            # Etiqueta Pasillo Y
            if y > 0:
                canvas.setFillColor(colors.HexColor("#64748b"))
                canvas.setFont("Helvetica-Bold", 8)
                canvas.drawString(15, cy - 3, f"Pasillo {y}")

        # Dibujar estantes visuales entre las líneas de pasillo (Estante 1, 2, 3 en columnas Izq/Der)
        canvas.setFillColor(colors.HexColor("#f1f5f9"))
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        for x in (0, 1): # x=0: izquierdo, x=1: derecho
            for est in (1, 2, 3):
                cx, cy_low = to_canvas(x, est - 1)
                _, cy_high = to_canvas(x, est)
                cy_center = (cy_low + cy_high) / 2.0
                rect_h = (cy_high - cy_low) - 16 # Deja margen para los pasillos

                canvas.rect(cx + 12, cy_center - rect_h/2.0, scale_x - 24, rect_h, fill=1, stroke=1)

                # Nombre del estante dentro del bloque
                canvas.setFillColor(colors.HexColor("#94a3b8"))
                canvas.setFont("Helvetica-Bold", 7.5)
                lado_txt = "Izq" if x == 0 else "Der"
                canvas.drawCentredString(cx + scale_x/2.0, cy_center - 2.5, f"Estante {est} ({lado_txt})")

        # Dibujar base
        bx, by = to_canvas(self.base_x, self.base_y)
        canvas.setFillColor(colors.HexColor("#10b981"))
        canvas.circle(bx, by, 8, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawCentredString(bx, by - 2.5, "B")

        # Función para dibujar flechas indicadoras en las líneas de ruta
        def draw_arrow(c, x1, y1, x2, y2, size=6):
            dx = x2 - x1
            dy = y2 - y1
            L = math.sqrt(dx*dx + dy*dy)
            if L > 0:
                angle = math.atan2(dy, dx)
                # Posición de la punta de la flecha retrocediendo un poco del marcador (radio 9)
                arrow_x = x2 - 9 * math.cos(angle)
                arrow_y = y2 - 9 * math.sin(angle)
                # Puntos de las alas
                p1_x = arrow_x - size * math.cos(angle - math.pi/6)
                p1_y = arrow_y - size * math.sin(angle - math.pi/6)
                p2_x = arrow_x - size * math.cos(angle + math.pi/6)
                p2_y = arrow_y - size * math.sin(angle + math.pi/6)
                
                path = c.beginPath()
                path.moveTo(arrow_x, arrow_y)
                path.lineTo(p1_x, p1_y)
                path.lineTo(p2_x, p2_y)
                path.close()
                c.drawPath(path, fill=1, stroke=0)

        # Dibujar ruta (líneas)
        px, py = bx, by
        canvas.setStrokeColor(colors.HexColor("#0284c7"))
        canvas.setFillColor(colors.HexColor("#0284c7"))
        canvas.setLineWidth(2)
        
        for p in self.paradas:
            gx, gy = p['x'], p['y']
            cx, cy = to_canvas(gx, gy)
            # Dibujar línea
            canvas.line(px, py, cx, cy)
            # Dibujar flecha
            draw_arrow(canvas, px, py, cx, cy)
            # Guardar posición
            px, py = cx, cy

        # Dibujar marcadores de paradas
        for idx, p in enumerate(self.paradas):
            gx, gy = p['x'], p['y']
            cx, cy = to_canvas(gx, gy)
            
            # Círculo
            canvas.setFillColor(colors.HexColor("#0284c7"))
            canvas.circle(cx, cy, 9, fill=1, stroke=1)
            
            # Texto del número de parada
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 8)
            canvas.drawCentredString(cx, cy - 3, str(idx + 1))


# ── CajaViewSet ───────────────────────────────────────────────────────────────

class CajaViewSet(viewsets.ModelViewSet):
    serializer_class = CajaSerializer

    def get_queryset(self):
        qs = Caja.objects.all().order_by('-hora_llegada')
        estado = self.request.query_params.get('estado')
        categoria = self.request.query_params.get('categoria')
        search = self.request.query_params.get('search')
        if estado:
            qs = qs.filter(estado=estado)
        if categoria:
            qs = qs.filter(categoria=categoria)
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(id__icontains=search) | Q(producto__icontains=search))
        return qs

    @action(detail=False, methods=['get'])
    def sugerir_id(self, request):
        """Sugiere un ID único para una nueva caja basado en la fecha actual."""
        fecha = timezone.localdate().strftime('%Y%m%d')
        prefijo = f'CAJ-{fecha}-'
        count = Caja.objects.filter(id__startswith=prefijo).count() + 1
        return Response({'id_sugerido': f'{prefijo}{count:03d}'})

    @action(detail=False, methods=['post'])
    def procesar_lote(self, request):
        """
        Procesa cajas pendientes:
        - Filtra hasta alcanzar el límite de peso, volumen o paradas.
        - Asigna ubicación óptima (o manual).
        - Calcula ruta óptima desde base (0,0).
        - Genera un enlace de descarga para el reporte PDF.
        """
        usuario_id = request.data.get('id_usuario')
        asignaciones = request.data.get('asignaciones', {})  # Diccionario { "id_caja": id_ubicacion_manual }
        cajas_pendientes = list(Caja.objects.filter(estado='pendiente').select_related('id_medida'))
 
        if not cajas_pendientes:
            return Response(
                {'error': 'No hay cajas pendientes para procesar'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        config = ConfigCarro.get_config()
        peso_acumulado = 0.0
        volumen_acumulado = 0.0
        cajas_a_procesar = []
 
        # Seleccionar cajas que caben en el carro
        for caja in cajas_pendientes:
            if len(cajas_a_procesar) >= config.max_paradas:
                break
            
            peso_caja = float(caja.peso_kg)
            vol_caja = float(caja.id_medida.volumen) if caja.id_medida and caja.id_medida.volumen else 0.0
 
            if peso_acumulado + peso_caja <= float(config.peso_maximo_kg) and \
               (volumen_acumulado + vol_caja <= float(config.volumen_cm3) or vol_caja == 0):
                peso_acumulado += peso_caja
                volumen_acumulado += vol_caja
                cajas_a_procesar.append(caja)
 
        if not cajas_a_procesar:
            return Response(
                {'error': 'Ninguna caja pendiente cabe en el carro con la configuración actual'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        paradas = []
        sin_ubicacion = []
 
        for caja in cajas_a_procesar:
            caja_id_str = str(caja.id)
            mejor_ubi = None
            detalle = None
 
            # Verificar si el usuario asignó una ubicación manualmente
            if caja_id_str in asignaciones and asignaciones[caja_id_str] is not None:
                try:
                    from .models import Ubicacion
                    manual_ubi_id = int(asignaciones[caja_id_str])
                    mejor_ubi = Ubicacion.objects.get(pk=manual_ubi_id)
                    detalle = {'score': 100, 'tipo': 'Manual'}
                except (Ubicacion.DoesNotExist, ValueError):
                    pass
 
            # Si no hay asignación manual, buscar la recomendada
            if not mejor_ubi:
                clasificacion = ClasificadorCajas.clasificar(caja)
                mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
                    clasificacion, caja=caja, incluir_detalle=True
                )
 
            if not mejor_ubi:
                sin_ubicacion.append(caja.id)
                continue
 
            with transaction.atomic():
                caja.id_ubicacion = mejor_ubi
                caja.estado = 'en_transito'
                caja.save()
                OptimizadorUbicaciones.ocupar_ubicacion(mejor_ubi)
                _registrar_historial(caja, 'pendiente', usuario_id)
 
            paradas.append({
                'caja_id': caja.id,
                'producto': caja.producto,
                'x': mejor_ubi.coord_x,
                'y': mejor_ubi.coord_y,
                'ubicacion_id': mejor_ubi.id_ubicacion,
                'ubicacion_nombre': str(mejor_ubi),
                'score': detalle.get('score') if detalle else None,
            })
 
        if not paradas:
            return Response(
                {'error': 'Ninguna caja pudo ser asignada a una ubicación'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        # Heurística TSP (Vecino más cercano) para ordenar la secuencia desde la base configurada
        paradas_ordenadas = RutaService.optimizar_paradas(config.pos_base_x, config.pos_base_y, paradas)
        cajas_ids_str = ",".join([p['caja_id'] for p in paradas_ordenadas])
        
        # URL dinámica para la descarga del PDF
        pdf_url = f"/api/cajas/descargar_pdf_lote/?cajas={cajas_ids_str}&usuario_id={usuario_id or ''}"
        
        logger.info("Lote procesado: %d paradas. Guía PDF generada: %s", len(paradas_ordenadas), pdf_url)
 
        return Response({
            'mensaje': f'✅ {len(paradas)} caja(s) procesada(s) con éxito. Descargando guía de ruta...',
            'total_paradas': len(paradas_ordenadas),
            'paradas': paradas_ordenadas,
            'sin_ubicacion': sin_ubicacion,
            'pdf_url': pdf_url,
        })

    @action(detail=False, methods=['get'])
    def descargar_pdf_lote(self, request):
        """
        Genera al vuelo un documento PDF con la ruta óptima de colocación,
        un mapa de rejilla visual y las justificaciones logísticas de cada ubicación.
        """
        if hasattr(request, 'query_params'):
            cajas_param = request.query_params.get('cajas', '')
            usuario_id = request.query_params.get('usuario_id')
        else:
            cajas_param = request.GET.get('cajas', '')
            usuario_id = request.GET.get('usuario_id')

        cajas_ids = [cid.strip() for cid in cajas_param.split(',') if cid.strip()]
        
        if not cajas_ids:
            return HttpResponse("Faltan los IDs de las cajas en los parámetros.", status=400)
            
        cajas = Caja.objects.filter(id__in=cajas_ids).select_related('id_ubicacion', 'id_medida', 'id_proveedor')
        if not cajas.exists():
            return HttpResponse("No se encontraron cajas con los IDs proporcionados.", status=404)
            
        # Obtener responsable
        operador_nombre = "No especificado"
        if usuario_id:
            try:
                operador = Usuario.objects.get(pk=int(usuario_id))
                operador_nombre = f"{operador.nombre} ({operador.get_rol_display()})"
            except (Usuario.DoesNotExist, ValueError):
                pass
                
        # Construir lista de paradas con justificaciones
        paradas = []
        for c in cajas:
            if c.id_ubicacion:
                clasificacion = ClasificadorCajas.clasificar(c)
                _, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
                    clasificacion, caja=c, incluir_detalle=True
                )
                motivos = detalle.get('motivos', []) if detalle else ['Asignación directa / manual']
                score = detalle.get('score', 100) if detalle else 100
                
                paradas.append({
                    'caja_id': c.id,
                    'producto': c.producto,
                    'x': c.id_ubicacion.coord_x,
                    'y': c.id_ubicacion.coord_y,
                    'ubicacion_nombre': str(c.id_ubicacion),
                    'peso_kg': float(c.peso_kg),
                    'categoria': c.categoria,
                    'proveedor': c.id_proveedor.nombre_empresa,
                    'motivos': motivos,
                    'score': score
                })
                
        if not paradas:
            return HttpResponse("Las cajas del lote no tienen ubicaciones asignadas.", status=400)
            
        # Obtener configuración para determinar la base
        config = ConfigCarro.get_config()
        base_x = config.pos_base_x
        base_y = config.pos_base_y
        
        # Ordenar las paradas por la ruta óptima TSP desde la base
        paradas_ordenadas = RutaService.optimizar_paradas(base_x, base_y, paradas)
        
        # Generar reporte PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        story = []
        
        # Configurar estilos de párrafo
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, textColor=colors.HexColor("#0f172a"), spaceAfter=2
        )
        subtitle_style = ParagraphStyle(
            'DocSubTitle', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=colors.HexColor("#64748b"), spaceAfter=12
        )
        heading_style = ParagraphStyle(
            'SectionHeading', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor("#1e293b"), spaceBefore=10, spaceAfter=5
        )
        body_style = ParagraphStyle(
            'BodyText', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, textColor=colors.HexColor("#334155")
        )
        body_bold = ParagraphStyle(
            'BodyTextBold', parent=body_style, fontName='Helvetica-Bold'
        )
        motivo_style = ParagraphStyle(
            'MotivoStyle', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor("#475569"), leading=9
        )
        
        # 1. Cabecera
        story.append(Paragraph("LOGISMART - ORDEN DE ALMACENAMIENTO", title_style))
        story.append(Paragraph("Guía detallada de colocación y ruta optimizada en almacén", subtitle_style))
        
        # Tabla de Metadatos del Lote
        fecha_actual = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
        meta_data = [
            [Paragraph(f"<b>Responsable:</b> {operador_nombre}", body_style), Paragraph(f"<b>Fecha/Hora:</b> {fecha_actual}", body_style)],
            [Paragraph(f"<b>Cajas en Lote:</b> {len(paradas_ordenadas)}", body_style), Paragraph(f"<b>Ruta de Operador:</b> Guía de Ruta Optimizada", body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))
        
        # 2. Mapa visual del recorrido
        story.append(Paragraph("MAPA DE RUTA EN EL GRID DEL ALMACÉN", heading_style))
        story.append(WarehouseMap(paradas_ordenadas, base_x=base_x, base_y=base_y, width=540, height=220))
        story.append(Spacer(1, 10))
        
        # Estilo para encabezados de tabla
        header_text_style = ParagraphStyle(
            'HeaderTextStyle', parent=body_bold, textColor=colors.white
        )

        # 3. Criterios de Optimización Logística
        story.append(Paragraph("CRITERIOS Y PARÁMETROS DE OPTIMIZACIÓN APLICADOS", heading_style))
        reglas_data = [
            [Paragraph("<b>Regla / Criterio</b>", header_text_style), Paragraph("<b>Descripción y Justificación Logística</b>", header_text_style)],
            [Paragraph("⚖️ Carga Pesada (&gt;= 20kg)", body_style), Paragraph("Prioridad en Nivel 1 (cerca del suelo) por ergonomía, estabilidad y seguridad estructural.", body_style)],
            [Paragraph("🏺 Carga Frágil", body_style), Paragraph("Restringido a estantes aptos. Prioridad alta en Nivel 2 (protección media). Penaliza niveles superiores.", body_style)],
            [Paragraph("🧪 Carga Química", body_style), Paragraph("Permitido exclusivamente en estantes con compatibilidad química habilitada.", body_style)],
            [Paragraph("⚡ Prioridad / Urgencia", body_style), Paragraph("Cajas urgentes se ubican prioritariamente en Pasillo A para reducir tiempos de despacho.", body_style)],
            [Paragraph("📦 Especialización de Estante", body_style), Paragraph("Bonificación por coincidencia con la categoría preferida del estante.", body_style)],
            [Paragraph("🔋 Uso de Capacidad", body_style), Paragraph("Bonificación (+10 pts) al ocupar de manera balanceada entre el 40% y 90% del límite del estante.", body_style)]
        ]
        reglas_table = Table(reglas_data, colWidths=[150, 390])
        reglas_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(reglas_table)
        story.append(Spacer(1, 10))
        
        # 4. Tabla detallada de cajas y justificaciones
        story.append(Paragraph("DETALLE DE CAJAS Y JUSTIFICACIÓN DE UBICACIÓN", heading_style))
        
        table_data = [[
            Paragraph("<b>N°</b>", header_text_style),
            Paragraph("<b>ID Caja</b>", header_text_style),
            Paragraph("<b>Producto</b>", header_text_style),
            Paragraph("<b>Ubicación</b>", header_text_style),
            Paragraph("<b>Coord</b>", header_text_style),
            Paragraph("<b>Criterio / Justificación Selección</b>", header_text_style)
        ]]
        
        for idx, p in enumerate(paradas_ordenadas):
            motivos_html = "<br/>".join([f"• {m}" for m in p['motivos']])
            table_data.append([
                Paragraph(str(idx + 1), body_style),
                Paragraph(p['caja_id'], body_style),
                Paragraph(p['producto'], body_style),
                Paragraph(p['ubicacion_nombre'], body_style),
                Paragraph(f"({p['x']}, {p['y']})", body_style),
                Paragraph(motivos_html, motivo_style)
            ])
            
        cajas_table = Table(table_data, colWidths=[20, 70, 90, 80, 35, 245])
        cajas_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(cajas_table)
        
        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(pdf_data, content_type='application/pdf')
        filename = f'ruta_almacenamiento_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get', 'post'])
    def previsualizar_lote(self, request):
        """
        Previsualiza qué cajas se procesarán y sus ubicaciones sugeridas,
        así como todas las ubicaciones libres en el almacén.
        """
        cajas_pendientes = list(Caja.objects.filter(estado='pendiente').select_related('id_medida'))
        if not cajas_pendientes:
            return Response(
                {'error': 'No hay cajas pendientes para procesar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config = ConfigCarro.get_config()
        peso_acumulado = 0.0
        volumen_acumulado = 0.0
        cajas_a_procesar = []

        # Seleccionar cajas que caben en el carro
        for caja in cajas_pendientes:
            if len(cajas_a_procesar) >= config.max_paradas:
                break
            
            peso_caja = float(caja.peso_kg)
            vol_caja = float(caja.id_medida.volumen) if caja.id_medida and caja.id_medida.volumen else 0.0

            if peso_acumulado + peso_caja <= float(config.peso_maximo_kg) and \
               (volumen_acumulado + vol_caja <= float(config.volumen_cm3) or vol_caja == 0):
                peso_acumulado += peso_caja
                volumen_acumulado += vol_caja
                cajas_a_procesar.append(caja)

        if not cajas_a_procesar:
            return Response(
                {'error': 'Ninguna caja pendiente cabe en el carro con la configuración actual'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cajas_preview = []
        for caja in cajas_a_procesar:
            clasificacion = ClasificadorCajas.clasificar(caja)
            mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
                clasificacion, caja=caja, incluir_detalle=True
            )
            cajas_preview.append({
                'id': caja.id,
                'producto': caja.producto,
                'peso_kg': float(caja.peso_kg),
                'categoria': caja.categoria,
                'es_fragil': caja.es_fragil,
                'sugerida_id': mejor_ubi.id_ubicacion if mejor_ubi else None,
                'sugerida_nombre': str(mejor_ubi) if mejor_ubi else 'Ninguna compatible',
            })

        # Todas las ubicaciones desocupadas
        from .models import Ubicacion
        libres_qs = Ubicacion.objects.filter(estado_ocupacion=False)
        ubicaciones_libres = [
            {'id_ubicacion': u.id_ubicacion, 'nombre': str(u)}
            for u in libres_qs
        ]

        return Response({
            'cajas': cajas_preview,
            'ubicaciones_libres': ubicaciones_libres,
            'peso_total': peso_acumulado,
            'volumen_total': volumen_acumulado,
            'max_paradas': config.max_paradas,
        })

    @action(detail=True, methods=['get'])
    def recomendar(self, request, pk=None):
        caja = self.get_object()
        clasificacion = ClasificadorCajas.clasificar(caja)
        mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            clasificacion, caja=caja, incluir_detalle=True
        )
        if not mejor_ubi:
            return Response(
                {'caja_id': caja.id, 'error': 'No hay ubicaciones compatibles', 'clasificacion': clasificacion},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'caja_id': caja.id,
            'clasificacion': clasificacion,
            'recomendacion': detalle or {},
            'ubicacion_recomendada': {
                'id': mejor_ubi.id_ubicacion,
                'nombre': str(mejor_ubi),
                'coordenadas': {'x': mejor_ubi.coord_x, 'y': mejor_ubi.coord_y},
                'metadatos_estante': {
                    'tipo_estante': mejor_ubi.tipo_estante,
                    'capacidad_peso_kg': str(mejor_ubi.capacidad_peso_kg),
                    'permite_fragil': mejor_ubi.permite_fragil,
                    'permite_quimico': mejor_ubi.permite_quimico,
                    'prioridad_categoria': mejor_ubi.prioridad_categoria,
                },
            },
        })

    @action(detail=True, methods=['post'])
    def procesar(self, request, pk=None):
        """Procesa una sola caja (flujo legacy individual)."""
        caja = self.get_object()
        estado_anterior = caja.estado
        usuario_id = request.data.get('id_usuario')
        clasificacion = ClasificadorCajas.clasificar(caja)
        mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            clasificacion, caja=caja, incluir_detalle=True
        )
        if not mejor_ubi:
            return Response({'error': 'No hay ubicaciones disponibles'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            caja.id_ubicacion = mejor_ubi
            caja.estado = 'en_transito'
            caja.save()
            OptimizadorUbicaciones.ocupar_ubicacion(mejor_ubi)
            _registrar_historial(caja, estado_anterior, usuario_id)

        carro_id = int(request.data.get('carro_id', 1))
        carro = _get_or_create_carro(carro_id)
        ruta = RutaService.generar_ruta(carro.pos_x, carro.pos_y, mejor_ubi.coord_x, mejor_ubi.coord_y)
        carro.paradas = [{'caja_id': caja.id, 'producto': caja.producto,
                          'x': mejor_ubi.coord_x, 'y': mejor_ubi.coord_y,
                          'ubicacion_id': mejor_ubi.id_ubicacion, 'ubicacion_nombre': str(mejor_ubi)}]
        carro.parada_actual = 0
        carro.destino_x = mejor_ubi.coord_x
        carro.destino_y = mejor_ubi.coord_y
        carro.ruta = ruta
        carro.estado = 'moviendo'
        carro.caja_id = caja.id
        carro.save()

        esp32_resultado = _enviar_esp32(mejor_ubi.coord_x, mejor_ubi.coord_y, caja_id=caja.id, carro_id=carro_id)
        return Response({
            'mensaje': '✅ Caja procesada',
            'caja': CajaSerializer(caja).data,
            'clasificacion': clasificacion,
            'ubicacion_asignada': {'id': mejor_ubi.id_ubicacion, 'nombre': str(mejor_ubi),
                                   'coordenadas': {'x': mejor_ubi.coord_x, 'y': mejor_ubi.coord_y},
                                   'metadatos_estante': {'tipo_estante': mejor_ubi.tipo_estante,
                                                         'capacidad_peso_kg': str(mejor_ubi.capacidad_peso_kg),
                                                         'permite_fragil': mejor_ubi.permite_fragil,
                                                         'permite_quimico': mejor_ubi.permite_quimico,
                                                         'prioridad_categoria': mejor_ubi.prioridad_categoria}},
            'recomendacion': detalle or {},
            'esp32': esp32_resultado,
        })

    @action(detail=True, methods=['post'])
    def confirmar_almacenada(self, request, pk=None):
        caja = self.get_object()
        if caja.estado != 'en_transito':
            return Response({'error': 'Transición inválida',
                             'detalle': f"Estado actual: '{caja.estado}'"}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = caja.estado
        with transaction.atomic():
            caja.estado = 'almacenada'
            caja.save()
            _registrar_historial(caja, estado_anterior, request.data.get('id_usuario'))
        carro = EstadoCarro.objects.filter(id=1).first()
        if carro and carro.caja_id == caja.id:
            carro.estado = 'llego'
            carro.ruta = []
            carro.save()
        return Response({'mensaje': 'Caja almacenada', 'caja': CajaSerializer(caja).data})

    @action(detail=True, methods=['post'])
    def confirmar_despacho(self, request, pk=None):
        caja = self.get_object()
        if caja.estado != 'almacenada':
            return Response({'error': 'Transición inválida',
                             'detalle': f"Estado actual: '{caja.estado}'"}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = caja.estado
        ubicacion_anterior = caja.id_ubicacion
        usuario_id = request.data.get('id_usuario')
        destino = request.data.get('destino', 'No especificado')
        placa = request.data.get('transporte_placa', 'N/A')

        with transaction.atomic():
            caja.estado = 'despachada'
            caja.id_ubicacion = None  # Liberar la referencia de la caja a la ubicación
            caja.save()
            if ubicacion_anterior:
                OptimizadorUbicaciones.liberar_ubicacion(ubicacion_anterior)
            _registrar_historial(caja, estado_anterior, usuario_id)

            if usuario_id:
                try:
                    usuario = Usuario.objects.get(id_usuario=usuario_id)
                    Despacho.objects.create(
                        id_caja=caja,
                        id_usuario_despacho=usuario,
                        destino=destino,
                        transporte_placa=placa
                    )
                except Usuario.DoesNotExist:
                    pass

        return Response({'mensaje': 'Caja despachada', 'caja': CajaSerializer(caja).data})


# ── Otros ViewSets ────────────────────────────────────────────────────────────

class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    pagination_class = None

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        libres = self.queryset.filter(estado_ocupacion=False)
        return Response(UbicacionSerializer(libres, many=True).data)


class MedidaViewSet(viewsets.ModelViewSet):
    queryset = Medida.objects.all()
    serializer_class = MedidaSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class ConfigCarroViewSet(viewsets.ModelViewSet):
    """Configuración de carros. Soporta carro_id dinámico."""
    serializer_class = ConfigCarroSerializer

    def get_queryset(self):
        return ConfigCarro.objects.all()

    def get_object(self):
        pk = self.kwargs.get('pk')
        if pk:
            try:
                return ConfigCarro.objects.get(pk=pk)
            except ConfigCarro.DoesNotExist:
                return ConfigCarro.get_config(int(pk))
        carro_id = int(self.request.query_params.get('carro_id', 1))
        return ConfigCarro.get_config(carro_id)

    @action(detail=False, methods=['get'])
    def actual(self, request):
        carro_id = int(request.query_params.get('carro_id', 1))
        config = ConfigCarro.get_config(carro_id)
        return Response(ConfigCarroSerializer(config).data)

    @action(detail=False, methods=['patch', 'put'])
    def actualizar(self, request):
        carro_id = int(request.query_params.get('carro_id', 1))
        config = ConfigCarro.get_config(carro_id)
        serializer = ConfigCarroSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer


class HistorialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialMovimientos.objects.all().order_by('-fecha_cambio')
    serializer_class = HistorialSerializer


class DespachoViewSet(viewsets.ModelViewSet):
    queryset = Despacho.objects.all()
    serializer_class = DespachoSerializer


# ── EstadoCarroViewSet ────────────────────────────────────────────────────────

class EstadoCarroViewSet(viewsets.ViewSet):

    def list(self, request):
        carro_id = int(request.query_params.get('carro_id', 1))
        carro = _get_or_create_carro(carro_id)
        return Response(EstadoCarroSerializer(carro).data)

    @action(detail=False, methods=['post'])
    def confirmar_parada(self, request):
        """
        Confirma la entrega en la parada actual:
        - Marca la caja como almacenada.
        - Avanza a la siguiente parada (o finaliza si era la última).
        """
        carro_id = int(request.data.get('carro_id', request.query_params.get('carro_id', 1)))
        carro = _get_or_create_carro(carro_id)
        paradas = carro.paradas or []
        usuario_id = request.data.get('id_usuario')

        if not paradas or carro.parada_actual >= len(paradas):
            return Response({'error': 'No hay parada activa'}, status=status.HTTP_400_BAD_REQUEST)

        parada = paradas[carro.parada_actual]
        caja_id = parada.get('caja_id')

        # Marcar caja como almacenada
        try:
            caja = Caja.objects.get(id=caja_id)
            if caja.estado == 'en_transito':
                with transaction.atomic():
                    caja.estado = 'almacenada'
                    caja.save()
                    _registrar_historial(caja, 'en_transito', usuario_id)
                logger.info("Caja %s almacenada en parada %d.", caja_id, carro.parada_actual)
        except Caja.DoesNotExist:
            logger.error("Caja %s no encontrada al confirmar parada.", caja_id)

        siguiente_idx = carro.parada_actual + 1

        if siguiente_idx >= len(paradas):
            # Todas las paradas completadas — regresar a base
            config = ConfigCarro.get_config(carro_id)
            bx, by = config.pos_base_x, config.pos_base_y
            if carro.pos_x != bx or carro.pos_y != by:
                ruta_regreso = RutaService.generar_ruta(carro.pos_x, carro.pos_y, bx, by)
                carro.estado = 'regresando'
                carro.destino_x = bx
                carro.destino_y = by
                carro.ruta = ruta_regreso
                
                # Publicar comando mover a base por MQTT
                _publicar_mqtt_comando({
                    'action': 'mover',
                    'destino_x': bx,
                    'destino_y': by,
                    'ruta': ruta_regreso,
                    'caja_id': None,
                    'carro_id': carro_id
                })
            else:
                carro.estado = 'esperando'
                carro.ruta = []
                # Publicar comando stop por MQTT
                _publicar_mqtt_comando({'action': 'stop', 'carro_id': carro_id})
            carro.paradas = []
            carro.parada_actual = 0
            carro.caja_id = None
            carro.save()
            logger.info("Ruta completada. Carro regresando a base (%d,%d).", bx, by)
            return Response({
                'mensaje': '✅ Entregas completadas. Carro regresando a base.',
                'finalizado': True,
                'regresando': carro.estado == 'regresando',
            })

        # Avanzar a siguiente parada
        siguiente = paradas[siguiente_idx]
        ruta = RutaService.generar_ruta(carro.pos_x, carro.pos_y, siguiente['x'], siguiente['y'])
        carro.parada_actual = siguiente_idx
        carro.destino_x = siguiente['x']
        carro.destino_y = siguiente['y']
        carro.ruta = ruta
        carro.estado = 'moviendo'
        carro.caja_id = siguiente['caja_id']
        carro.save()

        # Publicar comando mover a siguiente parada por MQTT
        _publicar_mqtt_comando({
            'action': 'mover',
            'destino_x': siguiente['x'],
            'destino_y': siguiente['y'],
            'ruta': ruta,
            'caja_id': siguiente['caja_id'],
            'carro_id': carro_id
        })

        esp32_resultado = _enviar_esp32(siguiente['x'], siguiente['y'], publish_mqtt=False)
        logger.info("Avanzando a parada %d → %s", siguiente_idx, siguiente['ubicacion_nombre'])

        return Response({
            'mensaje': f'Entrega confirmada → avanzando a parada {siguiente_idx + 1}/{len(paradas)}',
            'siguiente_parada': siguiente,
            'parada_actual': siguiente_idx,
            'total_paradas': len(paradas),
            'finalizado': False,
            'esp32': esp32_resultado,
        })

    @action(detail=False, methods=['post'])
    def avanzar(self, request):
        carro_id = int(request.data.get('carro_id', request.query_params.get('carro_id', 1)))
        carro = _get_or_create_carro(carro_id)
        ruta = carro.ruta or []
        if ruta:
            siguiente = ruta.pop(0)
            carro.pos_x = siguiente['x']
            carro.pos_y = siguiente['y']
            carro.ruta = ruta
            if ruta:
                # Aún en camino
                carro.estado = carro.estado  # mantiene 'moviendo' o 'regresando'
            else:
                # Llegó al destino
                if carro.estado == 'regresando':
                    carro.estado = 'esperando'  # llegó a base → listo
                    carro.caja_id = None
                    logger.info("Carro llegó a base (%d,%d).", carro.pos_x, carro.pos_y)
                    # Publicar stop por MQTT
                    _publicar_mqtt_comando({'action': 'stop', 'carro_id': carro_id})
                else:
                    carro.estado = 'llego'
            carro.save()
        return Response(EstadoCarroSerializer(carro).data)

    @action(detail=False, methods=['post'])
    def mover(self, request):
        carro_id = int(request.data.get('carro_id', request.query_params.get('carro_id', 1)))
        carro = _get_or_create_carro(carro_id)
        destino_x = int(request.data.get('destino_x', 0))
        destino_y = int(request.data.get('destino_y', 0))
        ruta = RutaService.generar_ruta(carro.pos_x, carro.pos_y, destino_x, destino_y)
        carro.destino_x = destino_x
        carro.destino_y = destino_y
        carro.ruta = ruta
        carro.estado = 'moviendo'
        carro.caja_id = request.data.get('caja_id')
        carro.save()
        
        # Publicar comando mover por MQTT
        _publicar_mqtt_comando({
            'action': 'mover',
            'destino_x': destino_x,
            'destino_y': destino_y,
            'ruta': ruta,
            'caja_id': request.data.get('caja_id'),
            'carro_id': carro_id
        })
        
        return Response({'mensaje': 'Ruta generada', 'ruta': ruta})

    @action(detail=False, methods=['post'])
    def reset(self, request):
        carro_id = int(request.data.get('carro_id', request.query_params.get('carro_id', 1)))
        carro = _get_or_create_carro(carro_id)
        for k, v in _CARRO_DEFAULTS.items():
            setattr(carro, k, v)
        carro.caja_id = None
        carro.save()
        
        # Publicar comando reset por MQTT
        _publicar_mqtt_comando({'action': 'reset', 'carro_id': carro_id})
        
        return Response({'mensaje': 'Carro reiniciado'})

    @action(detail=False, methods=['post', 'patch'])
    def telemetria(self, request):
        carro_id = int(request.data.get('carro_id', request.query_params.get('carro_id', 1)))
        carro = _get_or_create_carro(carro_id)
        campos = [
            'sensor_opt_izq_ext', 'sensor_opt_izq_int', 'sensor_opt_der_int', 'sensor_opt_der_ext',
            'sensor_obstaculo_frontal', 'sensor_obstaculo_trasero', 'motor_izq_vel', 'motor_der_vel'
        ]
        for c in campos:
            if c in request.data:
                val = request.data[c]
                if c in ['motor_izq_vel', 'motor_der_vel']:
                    val = int(val)
                else:
                    val = str(val).lower() == 'true'
                setattr(carro, c, val)
        carro.save()
        return Response(EstadoCarroSerializer(carro).data)


class SolicitudDespachoViewSet(viewsets.ModelViewSet):
    queryset = SolicitudDespacho.objects.all().order_by('-fecha_solicitud')
    serializer_class = SolicitudDespachoSerializer

    def perform_create(self, serializer):
        serializer.save(usuario_solicita=self.request.user)

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        if not request.user.is_superuser:
            return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
        
        solicitud = self.get_object()
        if solicitud.estado != 'pendiente':
            return Response({'error': 'La solicitud ya ha sido procesada.'}, status=status.HTTP_400_BAD_REQUEST)
        
        cajas = Caja.objects.filter(id__in=solicitud.cajas_ids)
        if not cajas.exists():
            return Response({'error': 'No se encontraron las cajas asociadas.'}, status=status.HTTP_400_BAD_REQUEST)
        
        errores = []
        with transaction.atomic():
            for caja in cajas:
                if caja.estado != 'almacenada':
                    errores.append(f"Caja {caja.id} no está almacenada (estado: {caja.estado})")
                    continue
                
                estado_anterior = caja.estado
                ubicacion_anterior = caja.id_ubicacion
                
                caja.estado = 'despachada'
                caja.id_ubicacion = None
                caja.save()
                
                if ubicacion_anterior:
                    OptimizadorUbicaciones.liberar_ubicacion(ubicacion_anterior)
                    
                _registrar_historial(caja, estado_anterior, solicitud.operador_responsable.id_usuario)
                
                Despacho.objects.create(
                    id_caja=caja,
                    id_usuario_despacho=solicitud.operador_responsable,
                    destino=solicitud.destino,
                    transporte_placa=solicitud.transporte_placa
                )
            
            solicitud.estado = 'aprobada'
            solicitud.save()
            
        if errores:
            return Response({'mensaje': 'Aprobada con advertencias', 'errores': errores})
        return Response({'mensaje': 'Solicitud aprobada y despacho procesado con éxito.'})

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        if not request.user.is_superuser:
            return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
        
        solicitud = self.get_object()
        if solicitud.estado != 'pendiente':
            return Response({'error': 'La solicitud ya ha sido procesada.'}, status=status.HTTP_400_BAD_REQUEST)
        
        solicitud.estado = 'rechazada'
        solicitud.save()
        return Response({'mensaje': 'Solicitud rechazada.'})


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    if request.user.is_authenticated:
        return Response({
            'is_authenticated': True,
            'username': request.user.username,
            'is_superuser': request.user.is_superuser,
        })
    return Response({
        'is_authenticated': False,
        'username': '',
        'is_superuser': False,
    })