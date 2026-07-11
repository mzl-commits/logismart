"""API REST agrupada por dominio funcional."""

from .common import (
    Caja, Despacho, DespachoSerializer, IsAuthenticated,
    OptimizadorUbicaciones, Planilla, PlanillaSerializer, Response,
    SolicitudDespacho, SolicitudDespachoSerializer, _registrar_historial,
    action, status, timezone, transaction, viewsets,
)

class DespachoViewSet(viewsets.ModelViewSet):
    queryset = Despacho.objects.all().order_by('-fecha_salida', '-id_despacho')
    serializer_class = DespachoSerializer


# ── EstadoCarroViewSet ────────────────────────────────────────────────────────


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


class PlanillaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlanillaSerializer
    permission_classes = [IsAuthenticated]
    queryset = Planilla.objects.select_related('operador', 'completada_por').all()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and not (user.is_staff or user.is_superuser):
            queryset = queryset.filter(operador=user)
        return queryset

    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        planilla = self.get_object()
        if planilla.completada:
            return Response({'detail': 'La planilla ya está completada.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (request.user.is_staff or request.user.is_superuser or planilla.operador_id == request.user.id):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        planilla.completada = True
        planilla.fecha_completada = timezone.now()
        planilla.completada_por = request.user
        planilla.save(update_fields=['completada', 'fecha_completada', 'completada_por'])
        return Response(self.get_serializer(planilla).data)
