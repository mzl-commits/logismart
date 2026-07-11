"""API REST agrupada por dominio funcional."""

from .common import (
    Caja, ConfigCarro, EstadoCarroSerializer, Response, RutaService,
    _CARRO_DEFAULTS, _enviar_esp32, _get_or_create_carro,
    _publicar_mqtt_comando, _registrar_historial, action, logger, status,
    transaction, viewsets,
)

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


