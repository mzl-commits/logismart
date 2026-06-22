import json
import logging
import time
import paho.mqtt.client as mqtt
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import close_old_connections, transaction
from clasificacion.models import EstadoCarro, Caja, ConfigCarro
from clasificacion.services.ruta_service import RutaService

logger = logging.getLogger('clasificacion')

def _publicar_mqtt_comando(payload):
    import paho.mqtt.publish as publish
    import json
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


class Command(BaseCommand):
    help = 'Daemon worker to listen for AGV telemetry via MQTT and update Django database.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting MQTT listener command...'))
        mqtt_cfg = settings.MQTT_CONFIG
        
        client = mqtt.Client()
        if mqtt_cfg['USER'] and mqtt_cfg['PASS']:
            client.username_pw_set(mqtt_cfg['USER'], mqtt_cfg['PASS'])
        
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.stdout.write(self.style.SUCCESS(f"Connected to Mosquitto Broker at {mqtt_cfg['BROKER']}"))
                client.subscribe(mqtt_cfg['TOPIC_TELEMETRIA'])
                self.stdout.write(self.style.SUCCESS(f"Subscribed to topic: {mqtt_cfg['TOPIC_TELEMETRIA']}"))
            else:
                self.stdout.write(self.style.ERROR(f"Connection failed with code {rc}"))
        
        def on_message(client, userdata, msg):
            close_old_connections()
            try:
                payload = json.loads(msg.payload.decode('utf-8'))
                self.stdout.write(self.style.NOTICE(f"Received MQTT payload: {payload}"))
                
                carro_id = int(payload.get("carro_id", 1))
                carro, _ = EstadoCarro.objects.get_or_create(id=carro_id)
                action = payload.get("action")
                
                if action == "avanzar":
                    # Avanzar el carro en la ruta
                    ruta = carro.ruta or []
                    if ruta:
                        siguiente = ruta.pop(0)
                        carro.pos_x = siguiente['x']
                        carro.pos_y = siguiente['y']
                        carro.ruta = ruta
                        if not ruta:
                            if carro.estado == 'regresando':
                                carro.estado = 'esperando'
                                carro.caja_id = None
                                _publicar_mqtt_comando({'action': 'stop', 'carro_id': carro_id})
                                self.stdout.write(self.style.SUCCESS(f"Carro {carro_id} llego a base. Detenido."))
                            else:
                                carro.estado = 'llego'
                                # Enviar stop para detener el carro físico en su destino
                                _publicar_mqtt_comando({'action': 'stop', 'carro_id': carro_id})
                                self.stdout.write(self.style.SUCCESS(f"Carro {carro_id} llego a destino de entrega. Enviado STOP."))
                        carro.save()
                        self.stdout.write(self.style.SUCCESS(f"Carro {carro_id} avanzó a ({carro.pos_x}, {carro.pos_y}). Estado: {carro.estado}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"Llamada a avanzar para carro {carro_id} pero la ruta está vacía."))
                
                elif action == "confirmar_parada":
                    # Lógica de confirmar parada
                    paradas = carro.paradas or []
                    if paradas and carro.parada_actual < len(paradas):
                        parada = paradas[carro.parada_actual]
                        caja_id = parada.get('caja_id')
                        
                        try:
                            caja = Caja.objects.get(id=caja_id)
                            if caja.estado == 'en_transito':
                                with transaction.atomic():
                                    caja.estado = 'almacenada'
                                    caja.save()
                                    from clasificacion.models import Usuario, HistorialMovimientos
                                    try:
                                        user = Usuario.objects.get(id_usuario=1)
                                        HistorialMovimientos.objects.create(
                                            id_caja=caja, id_usuario=user,
                                            estado_anterior='en_transito', estado_nuevo='almacenada'
                                        )
                                    except Exception:
                                        pass
                                self.stdout.write(self.style.SUCCESS(f"Caja {caja_id} marcada como almacenada."))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"Error al almacenar caja en parada: {e}"))
                            
                        siguiente_idx = carro.parada_actual + 1
                        if siguiente_idx >= len(paradas):
                            # Fin de paradas -> regresar a base
                            config = ConfigCarro.get_config(carro_id)
                            bx, by = config.pos_base_x, config.pos_base_y
                            if carro.pos_x != bx or carro.pos_y != by:
                                ruta_regreso = RutaService.generar_ruta(carro.pos_x, carro.pos_y, bx, by)
                                carro.estado = 'regresando'
                                carro.destino_x = bx
                                carro.destino_y = by
                                carro.ruta = ruta_regreso
                                carro.save()
                                _publicar_mqtt_comando({
                                    'action': 'mover',
                                    'destino_x': bx,
                                    'destino_y': by,
                                    'ruta': ruta_regreso,
                                    'caja_id': None,
                                    'carro_id': carro_id
                                })
                                self.stdout.write(self.style.SUCCESS(f"Ruta completada. Regresando a base en ({bx}, {by})."))
                            else:
                                carro.estado = 'esperando'
                                carro.ruta = []
                                carro.save()
                                _publicar_mqtt_comando({'action': 'stop', 'carro_id': carro_id})
                                self.stdout.write(self.style.SUCCESS("Ruta completada. Carro ya estaba en base."))
                        else:
                            # Avanzar a la siguiente parada
                            siguiente = paradas[siguiente_idx]
                            ruta = RutaService.generar_ruta(carro.pos_x, carro.pos_y, siguiente['x'], siguiente['y'])
                            carro.parada_actual = siguiente_idx
                            carro.destino_x = siguiente['x']
                            carro.destino_y = siguiente['y']
                            carro.ruta = ruta
                            carro.estado = 'moviendo'
                            carro.caja_id = siguiente['caja_id']
                            carro.save()
                            _publicar_mqtt_comando({
                                'action': 'mover',
                                'destino_x': siguiente['x'],
                                'destino_y': siguiente['y'],
                                'ruta': ruta,
                                'caja_id': siguiente['caja_id'],
                                'carro_id': carro_id
                            })
                            self.stdout.write(self.style.SUCCESS(f"Avanzando a siguiente parada: {siguiente}"))
                    else:
                        self.stdout.write(self.style.WARNING("Llamada a confirmar_parada pero no hay parada activa."))
                
                else:
                    # Telemetría estándar / actualización de campos
                    fields = [
                        'sensor_opt_izq_ext', 'sensor_opt_izq_int', 'sensor_opt_der_int', 'sensor_opt_der_ext',
                        'sensor_obstaculo_frontal', 'sensor_obstaculo_trasero', 'motor_izq_vel', 'motor_der_vel',
                        'pos_x', 'pos_y', 'destino_x', 'destino_y', 'estado', 'caja_id', 'parada_actual'
                    ]
                    
                    updated = False
                    for field in fields:
                        if field in payload:
                            val = payload[field]
                            if field in ['pos_x', 'pos_y', 'destino_x', 'destino_y', 'motor_izq_vel', 'motor_der_vel', 'parada_actual']:
                                val = int(val)
                            elif field in ['sensor_opt_izq_ext', 'sensor_opt_izq_int', 'sensor_opt_der_int', 'sensor_opt_der_ext', 'sensor_obstaculo_frontal', 'sensor_obstaculo_trasero']:
                                val = bool(val)
                            setattr(carro, field, val)
                            updated = True
                    
                    if updated:
                        carro.save()  # triggers WebSockets broadcast
                        self.stdout.write(self.style.SUCCESS("Updated EstadoCarro and broadcasted update."))
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing MQTT message: {e}"))
            finally:
                close_old_connections()
                
        client.on_connect = on_connect
        client.on_message = on_message
        
        while True:
            try:
                client.connect(mqtt_cfg['BROKER'], mqtt_cfg['PORT'], 60)
                break
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Broker connection failed: {e}. Retrying in 5 seconds..."))
                time.sleep(5)
                
        try:
            client.loop_forever()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("MQTT listener stopped by user."))
            client.disconnect()
