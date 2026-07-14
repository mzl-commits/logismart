# clasificacion/tests_iteration.py
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from .models import Caja, Ubicacion, Medida, Proveedor, Usuario, MovimientoInventario, Despacho

class IterationTests(TestCase):
    def setUp(self):
        # 1. Crear usuario de prueba y perfil
        self.user = get_user_model().objects.create_user('almacenero_iter', password='test-pass-iter')
        self.client.force_login(self.user)
        self.legacy_user = Usuario.objects.create(
            nombre='almacenero_iter', 
            rol='operador', 
            usuario_auth=self.user
        )
        
        # 2. Crear maestros de prueba (Medida, Proveedor, Ubicacion)
        self.measure = Medida.objects.create(nombre='IterMedida', largo=1, ancho=1, alto=1, volumen=1)
        self.provider = Proveedor.objects.create(nombre_empresa='IterProveedor', contacto='iter@test.com')
        self.location1 = Ubicacion.objects.create(
            pasillo='I', estante=1, nivel=1, 
            estado_ocupacion=False,
            tipo_estante='general', capacidad_peso_kg=Decimal('200.00'),
            permite_fragil=True
        )
        self.location2 = Ubicacion.objects.create(
            pasillo='I', estante=1, nivel=2, 
            estado_ocupacion=False,
            tipo_estante='general', capacidad_peso_kg=Decimal('200.00'),
            permite_fragil=True
        )

    def test_iter1_get_available_locations(self):
        """Iteración 1: Consultar ubicaciones disponibles."""
        response = self.client.get('/api/ubicaciones/disponibles/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 2)
        pasillos = [loc['pasillo'] for loc in data]
        self.assertIn('I', pasillos)

    def test_iter2_create_caja(self):
        """Iteración 2: Creación de caja (Ingreso al sistema)."""
        payload = {
            'id': 'CAJA-ITER-002',
            'producto': 'Engranaje C',
            'cantidad': 15,
            'peso_kg': '15.50',
            'prioridad': 'alta',
            'categoria': 'otro',
            'es_fragil': False,
            'id_medida': self.measure.pk,
            'id_proveedor': self.provider.pk
        }
        response = self.client.post('/api/cajas/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Caja.objects.filter(id='CAJA-ITER-002').exists())

    def test_iter3_recomendar_ubicacion(self):
        """Iteración 3: Obtener recomendación de ubicación inteligente."""
        caja = Caja.objects.create(
            id='CAJA-ITER-003', producto='Sensor H', cantidad=5,
            peso_kg=Decimal('2.00'), prioridad='alta', categoria='otro',
            estado='pendiente', id_medida=self.measure, id_proveedor=self.provider
        )
        response = self.client.get(f'/api/cajas/{caja.id}/recomendar/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['caja_id'], caja.id)
        self.assertIn('ubicacion_recomendada', data)
        # La carga prioritaria y ligera se manipula mejor a altura media.
        self.assertEqual(data['ubicacion_recomendada']['id'], self.location2.id_ubicacion)

    def test_iter4_previsualizar_lote(self):
        """Iteración 4: Simulación y previsualización de carga en lote."""
        caja = Caja.objects.create(
            id='CAJA-ITER-004', producto='Tubo de Cobre', cantidad=8,
            peso_kg=Decimal('12.00'), prioridad='media', categoria='otro',
            estado='pendiente', id_medida=self.measure, id_proveedor=self.provider
        )
        response = self.client.post('/api/cajas/previsualizar_lote/', {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('cajas', data)
        self.assertGreaterEqual(len(data['cajas']), 1)
        self.assertEqual(data['cajas'][0]['id'], caja.id)

    def test_iter5_procesar_individual(self):
        """Iteración 5: Proceso individual de caja (Asignar ubicación y cambiar estado)."""
        caja = Caja.objects.create(
            id='CAJA-ITER-005', producto='Acoplamiento J', cantidad=30,
            peso_kg=Decimal('5.00'), prioridad='media', categoria='otro',
            estado='pendiente', id_medida=self.measure, id_proveedor=self.provider
        )
        response = self.client.post(f'/api/cajas/{caja.id}/procesar/', {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        caja.refresh_from_db()
        self.assertEqual(caja.estado, 'en_transito')
        self.assertIsNotNone(caja.id_ubicacion)

    def test_iter6_confirmar_almacenada(self):
        """Iteración 6: Confirmar almacenamiento final de la caja."""
        caja = Caja.objects.create(
            id='CAJA-ITER-006', producto='Perno Grado 8', cantidad=100,
            peso_kg=Decimal('0.10'), prioridad='baja', categoria='otro',
            estado='en_transito', id_medida=self.measure, id_proveedor=self.provider,
            id_ubicacion=self.location1
        )
        response = self.client.post(f'/api/cajas/{caja.id}/confirmar_almacenada/', {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        caja.refresh_from_db()
        self.assertEqual(caja.estado, 'almacenada')

    def test_iter7_reservar_stock(self):
        """Iteración 7: Reserva de stock de una caja almacenada."""
        caja = Caja.objects.create(
            id='CAJA-ITER-007', producto='Válvula 2 pulg', cantidad=10,
            peso_kg=Decimal('8.50'), prioridad='alta', categoria='otro',
            estado='almacenada', id_medida=self.measure, id_proveedor=self.provider,
            id_ubicacion=self.location1
        )
        payload = {'caja': caja.id, 'cantidad': 3}
        response = self.client.post('/api/inventario/reservar/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        # Verificar estado físico vs reservado vs disponible
        inv_resp = self.client.get('/api/inventario/').json()
        item = [i for i in inv_resp['items'] if i['id'] == caja.id][0]
        self.assertEqual(item['fisico'], 10)
        self.assertEqual(item['reservado'], 3)
        self.assertEqual(item['disponible'], 7)

    def test_iter8_despachar_parcial(self):
        """Iteración 8: Registro de despacho parcial de una caja almacenada."""
        caja = Caja.objects.create(
            id='CAJA-ITER-008', producto='Fusible K', cantidad=25,
            peso_kg=Decimal('0.50'), prioridad='baja', categoria='otro',
            estado='almacenada', id_medida=self.measure, id_proveedor=self.provider,
            id_ubicacion=self.location1
        )
        payload = {
            'caja': caja.id,
            'cantidad': 10,
            'destino': 'Taller Norte',
            'transporte_placa': 'XYZ-987'
        }
        response = self.client.post('/api/inventario/despachar/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        caja.refresh_from_db()
        self.assertEqual(caja.cantidad, 15)
        self.assertEqual(caja.estado, 'almacenada')
        self.assertTrue(Despacho.objects.filter(id_caja=caja, cantidad=10).exists())

    def test_iter9_despachar_total(self):
        """Iteración 9: Registro de despacho total (Cierra existencia y libera ubicación)."""
        caja = Caja.objects.create(
            id='CAJA-ITER-009', producto='Cable Eléctrico 12AWG', cantidad=5,
            peso_kg=Decimal('6.00'), prioridad='media', categoria='otro',
            estado='almacenada', id_medida=self.measure, id_proveedor=self.provider,
            id_ubicacion=self.location1
        )
        payload = {
            'caja': caja.id,
            'cantidad': 5,
            'destino': 'Sucursal Sur',
            'transporte_placa': 'LOG-777'
        }
        response = self.client.post('/api/inventario/despachar/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        caja.refresh_from_db()
        self.assertEqual(caja.cantidad, 0)
        self.assertEqual(caja.estado, 'despachada')
        self.assertIsNone(caja.id_ubicacion)

    def test_iter10_audit_history(self):
        """Iteración 10: Auditoría de movimientos (Kardex e historial de inventario)."""
        caja = Caja.objects.create(
            id='CAJA-ITER-010', producto='Cinta Aislante', cantidad=20,
            peso_kg=Decimal('0.20'), prioridad='baja', categoria='otro',
            estado='almacenada', id_medida=self.measure, id_proveedor=self.provider,
            id_ubicacion=self.location1
        )
        # Provocar movimiento
        self.client.post('/api/inventario/reservar/', {'caja': caja.id, 'cantidad': 5}, content_type='application/json')
        
        response = self.client.get('/api/inventario/kardex/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        caja_entries = [entry for entry in data if entry['caja'] == caja.id]
        self.assertGreaterEqual(len(caja_entries), 1)
