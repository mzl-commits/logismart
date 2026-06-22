import json
import logging

import paho.mqtt.client as mqtt
from django.conf import settings

logger = logging.getLogger('clasificacion')


def publicar_mqtt_comando(payload):
    """Publica un comando MQTT esperando confirmacion antes de cerrar."""
    mqtt_cfg = settings.MQTT_CONFIG
    client = mqtt.Client()

    try:
        if mqtt_cfg['USER'] and mqtt_cfg['PASS']:
            client.username_pw_set(mqtt_cfg['USER'], mqtt_cfg['PASS'])

        client.connect(mqtt_cfg['BROKER'], mqtt_cfg['PORT'], keepalive=10)
        client.loop_start()
        info = client.publish(
            mqtt_cfg['TOPIC_COMANDO'],
            payload=json.dumps(payload),
            qos=1,
        )
        info.wait_for_publish()
        logger.info("Publicado comando MQTT a %s: %s", mqtt_cfg['TOPIC_COMANDO'], payload)
    except Exception as exc:
        logger.error("Error al publicar comando MQTT: %s", exc)
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass
