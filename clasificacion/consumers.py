import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import EstadoCarro
from .serializers import EstadoCarroSerializer

class CarroConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "carro_group"

        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Send initial state
        state = await self.get_current_state()
        await self.send(text_data=json.dumps({
            "type": "initial_state",
            "data": state
        }))

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("action") == "get_state":
                state = await self.get_current_state()
                await self.send(text_data=json.dumps({
                    "type": "state_update",
                    "data": state
                }))
        except Exception:
            pass

    async def carro_update(self, event):
        # Send message to WebSocket client
        await self.send(text_data=json.dumps({
            "type": "state_update",
            "data": event["data"]
        }))

    @database_sync_to_async
    def get_current_state(self):
        carro, _ = EstadoCarro.objects.get_or_create(id=1, defaults={
            'pos_x': 0, 'pos_y': 0,
            'destino_x': 0, 'destino_y': 0,
            'ruta': [], 'estado': 'esperando',
            'paradas': [], 'parada_actual': 0,
        })
        return EstadoCarroSerializer(carro).data
