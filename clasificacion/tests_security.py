from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from .models import Caja, Medida, Proveedor


@override_settings(EXTERNAL_API_KEY='integration-test-key')
class SeguridadAPITests(TestCase):
    def test_api_interna_rechaza_anonimos(self):
        response = self.client.get('/api/cajas/', secure=True)
        self.assertIn(response.status_code, (401, 403))

    def test_api_interna_acepta_sesion_autenticada(self):
        user = get_user_model().objects.create_user(
            username='api_test', password='UnaClave-Segura-123'
        )
        self.client.force_login(user)
        response = self.client.get('/api/cajas/', secure=True)
        self.assertEqual(response.status_code, 200)

    def test_api_v1_rechaza_sin_api_key(self):
        response = self.client.get('/api/v1/cajas', secure=True)
        self.assertEqual(response.status_code, 401)

    def test_api_v1_acepta_api_key_valida(self):
        response = self.client.get(
            '/api/v1/cajas', HTTP_X_API_KEY='integration-test-key', secure=True
        )
        self.assertEqual(response.status_code, 200)

    def test_api_v1_interpreta_false_como_falso(self):
        Medida.objects.create(
            nombre='Estándar', largo=1, ancho=1, alto=1, volumen=1
        )
        Proveedor.objects.create(
            nombre_empresa='Proveedor Test', contacto='test@example.com'
        )
        response = self.client.post(
            '/api/v1/cajas',
            data={
                'id': 'CAJA-API-V1',
                'producto': 'Prueba booleana',
                'cantidad': 1,
                'es_fragil': 'false',
            },
            content_type='application/json',
            HTTP_X_API_KEY='integration-test-key',
            secure=True,
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(Caja.objects.get(pk='CAJA-API-V1').es_fragil)


class SeguridadWebSocketTests(TestCase):
    def test_websocket_rechaza_anonimos(self):
        from almacen_config.asgi import application

        async def comprobar():
            communicator = WebsocketCommunicator(application, '/ws/carro/')
            connected, close_code = await communicator.connect()
            self.assertFalse(connected)
            self.assertEqual(close_code, 4401)

        async_to_sync(comprobar)()
