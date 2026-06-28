# clasificacion/tests.py
"""
Tests unitarios básicos para el sistema logístico.
Cubre lógica crítica: clasificador, optimizador y transiciones de estado.
"""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from .models import Caja, Ubicacion, Medida, Proveedor, Usuario
from .services.clasificador import ClasificadorCajas
from .services.optimizador import OptimizadorUbicaciones
from .services.ruta_service import RutaService


# ─── Fixtures helpers ─────────────────────────────────────────────────────────

def crear_medida(**kwargs):
    defaults = {'nombre': 'Estándar', 'largo': 1, 'ancho': 1, 'alto': 1, 'volumen': 1}
    return Medida.objects.create(**{**defaults, **kwargs})


def crear_proveedor(**kwargs):
    defaults = {'nombre_empresa': 'Proveedor Test', 'contacto': 'test@test.com'}
    return Proveedor.objects.create(**{**defaults, **kwargs})


def crear_ubicacion(**kwargs):
    defaults = {
        'pasillo': 'A', 'estante': 1, 'nivel': 1,
        'estado_ocupacion': False, 'tipo_estante': 'general',
        'capacidad_peso_kg': Decimal('100'), 'permite_fragil': True,
        'permite_quimico': False, 'prioridad_categoria': 'sin_preferencia',
    }
    return Ubicacion.objects.create(**{**defaults, **kwargs})


def crear_caja(**kwargs):
    medida = kwargs.pop('medida', None) or crear_medida()
    proveedor = kwargs.pop('proveedor', None) or crear_proveedor()
    defaults = {
        'id': 'CAJA-TEST-001', 'producto': 'Producto Test',
        'cantidad': 1, 'peso_kg': Decimal('10'),
        'prioridad': 'media', 'categoria': 'otro',
        'es_fragil': False, 'estado': 'pendiente',
        'id_medida': medida, 'id_proveedor': proveedor,
    }
    return Caja.objects.create(**{**defaults, **kwargs})


# ─── Tests del Clasificador ───────────────────────────────────────────────────

class ClasificadorTests(TestCase):

    def test_clasifica_ligero(self):
        caja = crear_caja(peso_kg=Decimal('3'))
        result = ClasificadorCajas.clasificar(caja)
        self.assertEqual(result['peso_categoria'], 'ligero')
        self.assertIn('ligero', result['tags'])

    def test_clasifica_normal(self):
        caja = crear_caja(peso_kg=Decimal('10'))
        result = ClasificadorCajas.clasificar(caja)
        self.assertEqual(result['peso_categoria'], 'normal')
        self.assertNotIn('pesado', result['tags'])
        self.assertNotIn('ligero', result['tags'])

    def test_clasifica_pesado(self):
        caja = crear_caja(peso_kg=Decimal('25'))
        result = ClasificadorCajas.clasificar(caja)
        self.assertEqual(result['peso_categoria'], 'pesado')
        self.assertIn('pesado', result['tags'])

    def test_clasifica_fragil(self):
        caja = crear_caja(es_fragil=True)
        result = ClasificadorCajas.clasificar(caja)
        self.assertTrue(result['es_fragil'])
        self.assertIn('fragil', result['tags'])

    def test_clasifica_urgente(self):
        caja = crear_caja(prioridad='urgente')
        result = ClasificadorCajas.clasificar(caja)
        self.assertIn('urgente', result['tags'])

    def test_clasifica_alta_es_urgente(self):
        caja = crear_caja(prioridad='alta')
        result = ClasificadorCajas.clasificar(caja)
        self.assertIn('urgente', result['tags'])


# ─── Tests del Optimizador ───────────────────────────────────────────────────

class OptimizadorTests(TestCase):

    def test_encuentra_ubicacion_libre(self):
        ubicacion = crear_ubicacion()
        caja = crear_caja()
        clasificacion = ClasificadorCajas.clasificar(caja)
        resultado = OptimizadorUbicaciones.encontrar_mejor_ubicacion(clasificacion, caja=caja)
        self.assertIsNotNone(resultado)

    def test_no_asigna_ubicacion_ocupada(self):
        crear_ubicacion(estado_ocupacion=True)
        caja = crear_caja()
        clasificacion = ClasificadorCajas.clasificar(caja)
        resultado = OptimizadorUbicaciones.encontrar_mejor_ubicacion(clasificacion, caja=caja)
        self.assertIsNone(resultado)

    def test_no_asigna_fragil_en_estante_no_fragil(self):
        crear_ubicacion(permite_fragil=False)
        caja = crear_caja(es_fragil=True)
        clasificacion = ClasificadorCajas.clasificar(caja)
        resultado = OptimizadorUbicaciones.encontrar_mejor_ubicacion(clasificacion, caja=caja)
        self.assertIsNone(resultado)

    def test_no_asigna_si_supera_capacidad(self):
        crear_ubicacion(capacidad_peso_kg=Decimal('5'))
        caja = crear_caja(peso_kg=Decimal('50'))
        clasificacion = ClasificadorCajas.clasificar(caja)
        resultado = OptimizadorUbicaciones.encontrar_mejor_ubicacion(clasificacion, caja=caja)
        self.assertIsNone(resultado)

    def test_retorna_detalle_con_score(self):
        crear_ubicacion()
        caja = crear_caja()
        clasificacion = ClasificadorCajas.clasificar(caja)
        ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            clasificacion, caja=caja, incluir_detalle=True
        )
        self.assertIsNotNone(ubi)
        self.assertIn('score', detalle)
        self.assertIsInstance(detalle['score'], int)

    def test_liberar_ubicacion(self):
        ubi = crear_ubicacion(estado_ocupacion=True)
        OptimizadorUbicaciones.liberar_ubicacion(ubi)
        ubi.refresh_from_db()
        self.assertFalse(ubi.estado_ocupacion)

    def test_ocupar_ubicacion(self):
        ubi = crear_ubicacion(estado_ocupacion=False)
        OptimizadorUbicaciones.ocupar_ubicacion(ubi)
        ubi.refresh_from_db()
        self.assertTrue(ubi.estado_ocupacion)


# ─── Tests del RutaService ────────────────────────────────────────────────────

class RutaServiceTests(TestCase):

    def test_ruta_misma_posicion(self):
        ruta = RutaService.generar_ruta(0, 0, 0, 0)
        self.assertEqual(ruta, [])

    def test_ruta_solo_x(self):
        ruta = RutaService.generar_ruta(0, 0, 3, 0)
        xs = [p['x'] for p in ruta]
        self.assertEqual(xs, [1, 2, 3])

    def test_ruta_solo_y(self):
        # Primero debe ir a la Avenida Central (x=1), subir en Y y luego ir a destino_x (0)
        ruta = RutaService.generar_ruta(0, 0, 0, 2)
        ys = [p['y'] for p in ruta]
        xs = [p['x'] for p in ruta]
        self.assertEqual(xs, [1, 1, 1, 0])
        self.assertEqual(ys, [0, 1, 2, 2])

    def test_ruta_diagonal_va_por_avenida(self):
        ruta = RutaService.generar_ruta(0, 0, 2, 2)
        # Primero va a la Avenida Central (1, 0)
        self.assertEqual(ruta[0], {'x': 1, 'y': 0})
        # Luego avanza por la avenida en Y
        self.assertEqual(ruta[1], {'x': 1, 'y': 1})
        self.assertEqual(ruta[2], {'x': 1, 'y': 2})
        # Finalmente dobla hacia el estante
        self.assertEqual(ruta[3], {'x': 2, 'y': 2})

    def test_ruta_retroceso(self):
        ruta = RutaService.generar_ruta(3, 3, 1, 1)
        self.assertEqual(ruta[0], {'x': 1, 'y': 3})
        self.assertEqual(ruta[-1], {'x': 1, 'y': 1})


# ─── Tests de transiciones de estado (API) ────────────────────────────────────

class TransicionEstadoTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.create_user(username='test_op_user', password='password')
        self.client.force_login(user)
        self.medida = crear_medida()
        self.proveedor = crear_proveedor()
        self.usuario = Usuario.objects.create(nombre='Test Op', rol='operador')

    def test_confirmar_almacenada_invalida_si_no_en_transito(self):
        caja = crear_caja(estado='pendiente', medida=self.medida, proveedor=self.proveedor)
        url = f'/api/cajas/{caja.id}/confirmar_almacenada/'
        res = self.client.post(url, content_type='application/json',
                               data={'id_usuario': self.usuario.id_usuario})
        self.assertEqual(res.status_code, 400)

    def test_confirmar_despacho_invalido_si_no_almacenada(self):
        caja = crear_caja(estado='en_transito', medida=self.medida, proveedor=self.proveedor)
        url = f'/api/cajas/{caja.id}/confirmar_despacho/'
        res = self.client.post(url, content_type='application/json',
                               data={'id_usuario': self.usuario.id_usuario})
        self.assertEqual(res.status_code, 400)

    def test_despachar_libera_ubicacion(self):
        ubicacion = crear_ubicacion(estado_ocupacion=True)
        caja = crear_caja(
            estado='almacenada',
            medida=self.medida,
            proveedor=self.proveedor,
            id='CAJA-DESP-001',
        )
        caja.id_ubicacion = ubicacion
        caja.save()

        url = f'/api/cajas/{caja.id}/confirmar_despacho/'
        res = self.client.post(url, content_type='application/json',
                               data={'id_usuario': self.usuario.id_usuario})
        self.assertEqual(res.status_code, 200)

        ubicacion.refresh_from_db()
        self.assertFalse(ubicacion.estado_ocupacion, "La ubicación debe quedar libre tras el despacho")


class BatchPreviewAndOverrideTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.create_user(username='test_batch_user', password='password')
        self.client.force_login(user)
        self.medida = crear_medida()
        self.proveedor = crear_proveedor()
        self.usuario = Usuario.objects.create(nombre='Test Op', rol='operador')
        self.ubi_sugerida = crear_ubicacion(pasillo='A', estante=1, nivel=1)
        self.ubi_manual = crear_ubicacion(pasillo='B', estante=2, nivel=2)
        # Create a pending box
        self.caja = crear_caja(
            id='CAJA-BATCH-001',
            producto='Caja Test Batch',
            medida=self.medida,
            proveedor=self.proveedor
        )

    def test_previsualizar_lote(self):
        url = '/api/cajas/previsualizar_lote/'
        res = self.client.post(url, content_type='application/json', data={})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('cajas', data)
        self.assertIn('ubicaciones_libres', data)
        # Verify our box is in the preview list
        cajas = data['cajas']
        self.assertEqual(len(cajas), 1)
        self.assertEqual(cajas[0]['id'], 'CAJA-BATCH-001')
        self.assertEqual(cajas[0]['sugerida_id'], self.ubi_sugerida.id_ubicacion)

    def test_procesar_lote_con_sugerida_por_defecto(self):
        url = '/api/cajas/procesar_lote/'
        res = self.client.post(url, content_type='application/json', data={
            'id_usuario': self.usuario.id_usuario,
            'asignaciones': {}
        })
        self.assertEqual(res.status_code, 200)
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.estado, 'en_transito')
        self.assertEqual(self.caja.id_ubicacion, self.ubi_sugerida)
        self.ubi_sugerida.refresh_from_db()
        self.assertTrue(self.ubi_sugerida.estado_ocupacion)

    def test_procesar_lote_con_override_manual(self):
        url = '/api/cajas/procesar_lote/'
        res = self.client.post(url, content_type='application/json', data={
            'id_usuario': self.usuario.id_usuario,
            'asignaciones': {
                'CAJA-BATCH-001': self.ubi_manual.id_ubicacion
            }
        })
        self.assertEqual(res.status_code, 200)
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.estado, 'en_transito')
        self.assertEqual(self.caja.id_ubicacion, self.ubi_manual)
        self.ubi_manual.refresh_from_db()
        self.assertTrue(self.ubi_manual.estado_ocupacion)
        # Recommended one should remain free
        self.ubi_sugerida.refresh_from_db()
        self.assertFalse(self.ubi_sugerida.estado_ocupacion)

    def test_descargar_pdf_lote(self):
        # Asignar ubicación y cambiar a en_transito
        self.caja.id_ubicacion = self.ubi_sugerida
        self.caja.estado = 'en_transito'
        self.caja.save()
        
        url = f'/api/cajas/descargar_pdf_lote/?cajas=CAJA-BATCH-001&usuario_id={self.usuario.id_usuario}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/pdf')


