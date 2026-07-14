"""API REST agrupada por dominio funcional."""

from .common import (
    Caja, CajaSerializer, ClasificadorCajas, Despacho,
    Flowable, HttpResponse, OptimizadorUbicaciones, Paragraph, ParagraphStyle,
    Planilla, Response, RutaService, SimpleDocTemplate, Spacer, Table, TableStyle,
    Ubicacion, Usuario,
    _registrar_historial, action, colors, datetime, getSampleStyleSheet, io,
    letter, logger, math, status, timezone, transaction, viewsets,
)

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



def _resolve_usuario_id(request):
    if not request.user or not request.user.is_authenticated:
        return None
    return Usuario.objects.filter(usuario_auth=request.user).values_list('id_usuario', flat=True).first()


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
        usuario_id = _resolve_usuario_id(request)
        if not usuario_id:
            return Response(
                {'error': 'El usuario autenticado no tiene un perfil logistico asignado.', 'code': 'logistic_profile_required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        asignaciones = request.data.get('asignaciones', {})
        if not isinstance(asignaciones, dict):
            return Response(
                {'error': 'Las asignaciones deben enviarse como un objeto caja-ubicacion.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limite = min(max(int(request.data.get('limite', 20)), 1), 100)
        except (TypeError, ValueError):
            return Response({'error': 'El límite debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cajas_a_procesar = list(
                Caja.objects.select_for_update()
                .filter(estado='pendiente')
                .select_related('id_medida')
                .order_by('hora_llegada', 'id')[:limite]
            )
            if not cajas_a_procesar:
                return Response(
                    {'error': 'No hay cajas pendientes para procesar'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Mantiene estable el inventario de espacios durante toda la planificacion.
            list(Ubicacion.objects.select_for_update().filter(activo=True))

            manuales = {}
            for caja in cajas_a_procesar:
                valor = asignaciones.get(str(caja.id))
                if valor in (None, ''):
                    continue
                try:
                    manuales[str(caja.id)] = int(valor)
                except (TypeError, ValueError):
                    return Response(
                        {'error': f'La ubicacion manual de {caja.id} no es valida.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            ids_manuales = list(manuales.values())
            if len(ids_manuales) != len(set(ids_manuales)):
                return Response(
                    {
                        'error': 'Una ubicacion manual no puede asignarse a mas de una caja.',
                        'code': 'duplicate_manual_location',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ubicaciones_manuales = {
                ubicacion.id_ubicacion: ubicacion
                for ubicacion in Ubicacion.objects.filter(pk__in=ids_manuales)
            }
            faltantes = sorted(set(ids_manuales) - set(ubicaciones_manuales))
            if faltantes:
                return Response(
                    {'error': 'Hay ubicaciones manuales inexistentes.', 'ubicaciones': faltantes},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            plan = {}
            for caja in cajas_a_procesar:
                caja_id = str(caja.id)
                if caja_id not in manuales:
                    continue
                ubicacion = ubicaciones_manuales[manuales[caja_id]]
                compatible, detalle = OptimizadorUbicaciones.validar_ubicacion(caja, ubicacion)
                if not compatible:
                    return Response(
                        {
                            'error': f'La ubicacion manual elegida para {caja.id} es incompatible.',
                            'code': 'invalid_manual_assignment',
                            'motivos': detalle.get('motivos', []),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                detalle['tipo'] = 'manual'
                plan[caja_id] = (ubicacion, detalle)

            cajas_automaticas = [
                caja for caja in cajas_a_procesar if str(caja.id) not in manuales
            ]
            plan.update(OptimizadorUbicaciones.recomendar_lote(
                cajas_automaticas,
                ubicaciones_excluidas=ids_manuales,
            ))

            paradas = []
            sin_ubicacion = []
            ubicaciones_reservadas = []
            for caja in cajas_a_procesar:
                mejor_ubi, detalle = plan.get(str(caja.id), (None, None))
                if not mejor_ubi:
                    sin_ubicacion.append(caja.id)
                    continue

                caja.id_ubicacion = mejor_ubi
                caja.estado = 'en_transito'
                caja.save(update_fields=['id_ubicacion', 'estado'])
                _registrar_historial(caja, 'pendiente', usuario_id)
                ubicaciones_reservadas.append(mejor_ubi.id_ubicacion)
                paradas.append({
                    'caja_id': caja.id,
                    'producto': caja.producto,
                    'x': mejor_ubi.coord_x,
                    'y': mejor_ubi.coord_y,
                    'ubicacion_id': mejor_ubi.id_ubicacion,
                    'ubicacion_nombre': str(mejor_ubi),
                    'score': detalle.get('score') if detalle else None,
                    'tipo_asignacion': detalle.get('tipo', 'automatica') if detalle else 'automatica',
                    'motivos': detalle.get('motivos', []) if detalle else [],
                })

            if not paradas:
                return Response(
                    {'error': 'Ninguna caja pudo ser asignada a una ubicación'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            Ubicacion.objects.filter(pk__in=ubicaciones_reservadas).update(estado_ocupacion=True)
            paradas_ordenadas = RutaService.optimizar_paradas(0, 0, paradas)
            Planilla.objects.create(
                cajas_ids=[p['caja_id'] for p in paradas_ordenadas],
                operador=request.user,
            )

        cajas_ids_str = ",".join([p['caja_id'] for p in paradas_ordenadas])
        
        # URL dinámica para la descarga del PDF
        pdf_url = f"/api/cajas/descargar_pdf_lote/?cajas={cajas_ids_str}&usuario_id={request.user.id}"
        
        logger.info("Planilla registrada para el operador: %s", request.user.username)

        logger.info("Lote procesado: %d paradas. Guía PDF generada: %s", len(paradas_ordenadas), pdf_url)
 
        return Response({
            'mensaje': f'{len(paradas)} caja(s) procesada(s) con éxito. Guía lista para revisión.',
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
                from django.contrib.auth.models import User
                operador = User.objects.get(pk=int(usuario_id))
                operador_nombre = f"{operador.first_name or operador.username} (Operador)"
            except (User.DoesNotExist, ValueError):
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
            
        base_x = 0
        base_y = 0
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
        disposition = 'inline' if request.query_params.get('preview') == 'true' else 'attachment'
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        return response

    @action(detail=False, methods=['get', 'post'])
    def previsualizar_lote(self, request):
        """
        Previsualiza qué cajas se procesarán y sus ubicaciones sugeridas,
        así como todas las ubicaciones libres en el almacén.
        """
        valor_limite = request.data.get('limite') or request.query_params.get('limite', 20)
        try:
            limite = min(max(int(valor_limite), 1), 100)
        except (TypeError, ValueError):
            return Response(
                {'error': 'El límite debe ser un número entero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cajas_pendientes = list(
            Caja.objects.filter(estado='pendiente')
            .select_related('id_medida')
            .order_by('hora_llegada', 'id')[:limite]
        )
        if not cajas_pendientes:
            return Response(
                {'error': 'No hay cajas pendientes para procesar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cajas_a_procesar = cajas_pendientes
        plan = OptimizadorUbicaciones.recomendar_lote(cajas_a_procesar)

        cajas_preview = []
        peso_acumulado = 0.0
        volumen_acumulado = 0.0
        for caja in cajas_a_procesar:
            clasificacion = ClasificadorCajas.clasificar(caja)
            mejor_ubi, detalle = plan.get(str(caja.id), (None, None))
            compatibles = OptimizadorUbicaciones.evaluar_candidatos(
                caja,
                clasificacion=clasificacion,
            )
            cajas_preview.append({
                'id': caja.id,
                'producto': caja.producto,
                'peso_kg': float(caja.peso_kg),
                'peso_total_kg': clasificacion['peso_total_kg'],
                'cantidad': clasificacion['cantidad'],
                'categoria': caja.categoria,
                'es_fragil': caja.es_fragil,
                'requiere_refrigeracion': caja.requiere_refrigeracion,
                'sugerida_id': mejor_ubi.id_ubicacion if mejor_ubi else None,
                'sugerida_nombre': str(mejor_ubi) if mejor_ubi else 'Ninguna compatible',
                'recomendacion': detalle or {},
                'ubicaciones_compatibles_ids': [
                    ubicacion.id_ubicacion for ubicacion, _ in compatibles
                ],
            })
            peso_acumulado += clasificacion['peso_total_kg']
            if caja.id_medida and caja.id_medida.volumen:
                volumen_acumulado += float(caja.id_medida.volumen)

        # Todas las ubicaciones desocupadas
        from ..models import Ubicacion
        libres_qs = Ubicacion.objects.filter(estado_ocupacion=False, activo=True)
        ubicaciones_libres = [
            {'id_ubicacion': u.id_ubicacion, 'nombre': str(u)}
            for u in libres_qs
        ]

        return Response({
            'cajas': cajas_preview,
            'ubicaciones_libres': ubicaciones_libres,
            'peso_total': peso_acumulado,
            'volumen_total': volumen_acumulado,
            'limite_aplicado': len(cajas_a_procesar),
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
                    'dimensiones_utiles_cm': {
                        'ancho': str(mejor_ubi.ancho_util_cm),
                        'fondo': str(mejor_ubi.fondo_util_cm),
                        'alto': str(mejor_ubi.alto_util_cm),
                    },
                    'distancia_salida_m': str(mejor_ubi.distancia_salida_m),
                    'permite_fragil': mejor_ubi.permite_fragil,
                    'permite_quimico': mejor_ubi.permite_quimico,
                    'prioridad_categoria': mejor_ubi.prioridad_categoria,
                    'activo': mejor_ubi.activo,
                },
            },
        })

    @action(detail=True, methods=['post'])
    def procesar(self, request, pk=None):
        """Procesa una sola caja (flujo legacy individual)."""
        caja_ref = self.get_object()
        usuario_id = _resolve_usuario_id(request)
        if not usuario_id:
            return Response({'error': 'El usuario autenticado no tiene un perfil logistico asignado.', 'code': 'logistic_profile_required'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            caja = Caja.objects.select_for_update().select_related('id_medida').get(pk=caja_ref.pk)
            if caja.estado not in ('pendiente', 'clasificada'):
                return Response(
                    {
                        'error': 'Transición inválida',
                        'detalle': f"La caja en estado '{caja.estado}' no puede volver a procesarse.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            list(Ubicacion.objects.select_for_update().filter(activo=True))
            estado_anterior = caja.estado
            clasificacion = ClasificadorCajas.clasificar(caja)
            mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
                clasificacion, caja=caja, incluir_detalle=True
            )
            if not mejor_ubi:
                return Response(
                    {'error': 'No hay ubicaciones disponibles'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            caja.id_ubicacion = mejor_ubi
            caja.estado = 'en_transito'
            caja.save(update_fields=['id_ubicacion', 'estado'])
            OptimizadorUbicaciones.ocupar_ubicacion(mejor_ubi)
            _registrar_historial(caja, estado_anterior, usuario_id)

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
        })

    @action(detail=True, methods=['post'])
    def confirmar_almacenada(self, request, pk=None):
        caja = self.get_object()
        usuario_id = _resolve_usuario_id(request)
        if not usuario_id:
            return Response({'error': 'El usuario autenticado no tiene un perfil logistico asignado.', 'code': 'logistic_profile_required'}, status=status.HTTP_400_BAD_REQUEST)
        if caja.estado != 'en_transito':
            return Response({'error': 'Transición inválida',
                             'detalle': f"Estado actual: '{caja.estado}'"}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = caja.estado
        with transaction.atomic():
            caja.estado = 'almacenada'
            caja.save()
            _registrar_historial(caja, estado_anterior, usuario_id)
        return Response({'mensaje': 'Caja almacenada', 'caja': CajaSerializer(caja).data})

    @action(detail=True, methods=['post'])
    def confirmar_despacho(self, request, pk=None):
        caja = self.get_object()
        if caja.estado != 'almacenada':
            return Response({'error': 'Transición inválida',
                             'detalle': f"Estado actual: '{caja.estado}'"}, status=status.HTTP_400_BAD_REQUEST)
        estado_anterior = caja.estado
        ubicacion_anterior = caja.id_ubicacion
        usuario_id = _resolve_usuario_id(request)
        if not usuario_id:
            return Response({'error': 'El usuario autenticado no tiene un perfil logistico asignado.', 'code': 'logistic_profile_required'}, status=status.HTTP_400_BAD_REQUEST)
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

