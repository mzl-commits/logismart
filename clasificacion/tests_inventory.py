from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Caja, Despacho, Medida, MovimientoInventario, Proveedor, Ubicacion, Usuario


class InventoryFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('almacenero', password='test-pass')
        self.client.force_login(self.user)
        self.legacy_user = Usuario.objects.create(nombre='almacenero', rol='operador')
        measure = Medida.objects.create(nombre='Unidad', largo=1, ancho=1, alto=1, volumen=1)
        provider = Proveedor.objects.create(nombre_empresa='Proveedor', contacto='contacto')
        self.location = Ubicacion.objects.create(pasillo='A', estante=1, nivel=1, estado_ocupacion=True)
        self.box = Caja.objects.create(id='SKU-LOTE-01', producto='Rodamiento', cantidad=10,
                                       peso_kg=Decimal('2.50'), prioridad='media', categoria='otro',
                                       estado='almacenada', id_medida=measure, id_proveedor=provider,
                                       id_ubicacion=self.location)

    def test_reserva_resta_disponible_sin_restar_fisico(self):
        response = self.client.post('/api/inventario/reservar/', {'caja': self.box.pk, 'cantidad': 4}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        inventory = self.client.get('/api/inventario/').json()['items'][0]
        self.assertEqual((inventory['fisico'], inventory['reservado'], inventory['disponible']), (10, 4, 6))
        self.assertTrue(MovimientoInventario.objects.filter(tipo='reserva', cantidad=4).exists())

    def test_no_permite_sobre_reserva(self):
        self.client.post('/api/inventario/reservar/', {'caja': self.box.pk, 'cantidad': 8}, content_type='application/json')
        response = self.client.post('/api/inventario/reservar/', {'caja': self.box.pk, 'cantidad': 3}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_despacho_parcial_conserva_caja_y_registra_kardex(self):
        response = self.client.post('/api/inventario/despachar/', {
            'caja': self.box.pk, 'cantidad': 4, 'destino': 'Cliente', 'transporte_placa': 'ABC-123'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.box.refresh_from_db()
        self.assertEqual(self.box.cantidad, 6)
        self.assertEqual(self.box.estado, 'almacenada')
        self.assertTrue(Despacho.objects.filter(id_caja=self.box, cantidad=4).exists())
        self.assertTrue(MovimientoInventario.objects.filter(tipo='salida', existencia_posterior=6).exists())

    def test_despacho_total_cierra_existencia(self):
        response = self.client.post('/api/inventario/despachar/', {'caja': self.box.pk, 'cantidad': 10}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.box.refresh_from_db()
        self.assertEqual(self.box.cantidad, 0)
        self.assertEqual(self.box.estado, 'despachada')
        self.assertIsNone(self.box.id_ubicacion)
