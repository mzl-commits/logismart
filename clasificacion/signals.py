from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import EstadoCarro
from .serializers import EstadoCarroSerializer
import logging

logger = logging.getLogger('clasificacion')

@receiver(post_save, sender=EstadoCarro)
def broadcast_carro_update(sender, instance, **kwargs):
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            data = EstadoCarroSerializer(instance).data
            async_to_sync(channel_layer.group_send)(
                "carro_group",
                {
                    "type": "carro.update",
                    "data": data
                }
            )
            logger.debug("Broadcasted EstadoCarro update via WebSocket: %s", data)
        except Exception as e:
            logger.error("Error broadcasting EstadoCarro update: %s", e)
    else:
        logger.warning("Channel layer not configured. Could not broadcast update.")
