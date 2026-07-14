# clasificacion/tests.py
"""
Tests unitarios básicos para el sistema logístico.
Cubre lógica crítica: clasificador, optimizador y transiciones de estado.
"""
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Caja, Despacho, Ubicacion, Medida, Proveedor, Usuario
from .services.clasificador import ClasificadorCajas
from .services.optimizador import OptimizadorUbicaciones
from .services.ruta_service import RutaService
from .serializers import CajaSerializer, MedidaSerializer, UbicacionSerializer


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

    def test_calcula_peso_total_por_cantidad(self):
        caja = crear_caja(peso_kg=Decimal('6.5'), cantidad=4)
        result = ClasificadorCajas.clasificar(caja)
        self.assertEqual(result['peso_unitario_kg'], 6.5)
        self.assertEqual(result['peso_total_kg'], 26.0)
        self.assertEqual(result['peso_categoria'], 'pesado')

    def test_marca_cadena_de_frio(self):
        caja = crear_caja(requiere_refrigeracion=True)
        result = ClasificadorCajas.clasificar(caja)
        self.assertTrue(result['requiere_refrigeracion'])
        self.assertIn('cadena_frio', result['tags'])


class WarehouseDataValidationTests(TestCase):

    def test_rechaza_medidas_no_positivas(self):
        serializer = MedidaSerializer(data={
            'nombre': 'Invalida', 'largo': 0, 'ancho': 20, 'alto': 20,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('largo', serializer.errors)

    def test_rechaza_peso_y_cantidad_no_positivos(self):
        medida = crear_medida()
        proveedor = crear_proveedor()
        serializer = CajaSerializer(data={
            'id': 'CAJA-INVALIDA', 'producto': 'Invalido', 'cantidad': 0,
            'peso_kg': 0, 'id_medida': medida.pk, 'id_proveedor': proveedor.pk,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('cantidad', serializer.errors)
        self.assertIn('peso_kg', serializer.errors)

    def test_rechaza_capacidad_o_distancia_imposible(self):
        serializer = UbicacionSerializer(data={
            'pasillo': 'C', 'estante': 1, 'nivel': 1,
            'capacidad_peso_kg': 0, 'distancia_salida_m': -1,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('capacidad_peso_kg', serializer.errors)

    def test_alta_de_caja_no_permite_saltar_el_algoritmo(self):
        medida = crear_medida()
        proveedor = crear_proveedor()
        ubicacion = crear_ubicacion()
        serializer = CajaSerializer(data={
            'id': 'CAJA-CONTROLADA', 'producto': 'Controlada', 'cantidad': 1,
            'peso_kg': 10, 'id_medida': medida.pk, 'id_proveedor': proveedor.pk,
            'estado': 'almacenada', 'id_ubicacion': ubicacion.pk,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        caja = serializer.save()
        self.assertEqual(caja.estado, 'pendiente')
        self.assertIsNone(caja.id_ubicacion)


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

    def test_carga_pesada_prefiere_zona_reforzada(self):
        crear_ubicacion(pasillo='A', estante=1, tipo_estante='general', capacidad_peso_kg=100)
        reforzada = crear_ubicacion(
            pasillo='A', estante=2, tipo_estante='pesado',
            capacidad_peso_kg=150, prioridad_categoria='herramienta',
        )
        caja = crear_caja(peso_kg=Decimal('60'), categoria='herramienta')
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, reforzada)

    def test_carga_ligera_preserva_zona_reforzada(self):
        reforzada = crear_ubicacion(pasillo='A', estante=1, tipo_estante='pesado', capacidad_peso_kg=80)
        general = crear_ubicacion(pasillo='B', estante=1, tipo_estante='general', capacidad_peso_kg=40)
        caja = crear_caja(peso_kg=Decimal('5'))
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, general)
        self.assertNotEqual(result, reforzada)

    def test_fragil_prefiere_zona_protegida(self):
        crear_ubicacion(pasillo='B', estante=1, tipo_estante='general', permite_fragil=True)
        protegida = crear_ubicacion(
            pasillo='A', estante=1, nivel=2, tipo_estante='fragil',
            permite_fragil=True, prioridad_categoria='electronica',
        )
        caja = crear_caja(es_fragil=True, categoria='electronica')
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, protegida)

    def test_zona_quimica_no_se_asigna_a_producto_comun(self):
        crear_ubicacion(
            pasillo='A', estante=1, tipo_estante='quimico',
            permite_quimico=True, prioridad_categoria='quimico',
        )
        general = crear_ubicacion(pasillo='B', estante=1, tipo_estante='general')
        caja = crear_caja(categoria='textil')
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, general)

    def test_capacidad_considera_peso_total_no_unitario(self):
        crear_ubicacion(capacidad_peso_kg=Decimal('20'))
        caja = crear_caja(peso_kg=Decimal('6'), cantidad=4)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertIsNone(result)

    def test_admite_giro_horizontal_de_noventa_grados(self):
        ubicacion = crear_ubicacion(
            ancho_util_cm=60, fondo_util_cm=80, alto_util_cm=45,
        )
        medida = crear_medida(largo=80, ancho=50, alto=40, volumen=160000)
        caja = crear_caja(medida=medida)
        result, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja, incluir_detalle=True,
        )
        self.assertEqual(result, ubicacion)
        self.assertEqual(detalle['metricas']['orientacion'], 'base girada 90°')

    def test_rechaza_caja_que_no_cabe_fisicamente(self):
        crear_ubicacion(ancho_util_cm=50, fondo_util_cm=50, alto_util_cm=50)
        medida = crear_medida(largo=70, ancho=60, alto=55, volumen=231000)
        caja = crear_caja(medida=medida)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertIsNone(result)

    def test_cadena_de_frio_usa_solo_zona_refrigerada(self):
        crear_ubicacion(pasillo='A', estante=1, tipo_estante='general')
        refrigerada = crear_ubicacion(
            pasillo='A', estante=2, tipo_estante='refrigerado',
            prioridad_categoria='alimento',
        )
        caja = crear_caja(categoria='alimento', requiere_refrigeracion=True)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, refrigerada)

    def test_preserva_refrigeracion_para_producto_ambiente(self):
        crear_ubicacion(
            pasillo='A', estante=1, tipo_estante='refrigerado',
            prioridad_categoria='alimento',
        )
        general = crear_ubicacion(pasillo='B', estante=1, tipo_estante='general')
        caja = crear_caja(categoria='alimento', requiere_refrigeracion=False)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, general)

    def test_excluye_ubicacion_fuera_de_servicio(self):
        crear_ubicacion(activo=False)
        caja = crear_caja()
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertIsNone(result)

    def test_urgente_prefiere_menor_distancia(self):
        cercana = crear_ubicacion(
            pasillo='A', estante=1, nivel=2, distancia_salida_m=2,
        )
        crear_ubicacion(
            pasillo='B', estante=1, nivel=2, distancia_salida_m=14,
        )
        caja = crear_caja(prioridad='urgente')
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, cercana)

    def test_carga_pesada_prefiere_nivel_bajo(self):
        baja = crear_ubicacion(
            pasillo='A', estante=1, nivel=1, tipo_estante='pesado',
            capacidad_peso_kg=150, distancia_salida_m=8,
        )
        crear_ubicacion(
            pasillo='A', estante=1, nivel=3, tipo_estante='pesado',
            capacidad_peso_kg=150, distancia_salida_m=8,
        )
        caja = crear_caja(peso_kg=Decimal('60'))
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja
        )
        self.assertEqual(result, baja)

    def test_score_es_normalizado_y_explicable(self):
        crear_ubicacion()
        caja = crear_caja()
        _, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja, incluir_detalle=True,
        )
        self.assertGreaterEqual(detalle['score'], 0)
        self.assertLessEqual(detalle['score'], 100)
        self.assertEqual(detalle['version_algoritmo'], '2.0')
        self.assertEqual(
            set(detalle['componentes']),
            {
                'zona_y_seguridad', 'ergonomia', 'ajuste_capacidad',
                'accesibilidad', 'consolidacion', 'preservacion_recurso',
            },
        )

    def test_planificacion_de_lote_no_duplica_ubicaciones(self):
        crear_ubicacion(pasillo='A', estante=1)
        crear_ubicacion(pasillo='A', estante=2)
        primera = crear_caja(id='CAJA-LOTE-001')
        segunda = crear_caja(id='CAJA-LOTE-002')
        plan = OptimizadorUbicaciones.recomendar_lote([primera, segunda])
        ids = [plan[str(caja.id)][0].id_ubicacion for caja in (primera, segunda)]
        self.assertEqual(len(ids), len(set(ids)))

    def test_planificacion_prioriza_restriccion_quimica(self):
        quimica = crear_ubicacion(
            pasillo='A', estante=1, tipo_estante='quimico', permite_quimico=True,
        )
        general = crear_ubicacion(pasillo='B', estante=1, tipo_estante='general')
        caja_general = crear_caja(id='CAJA-GENERAL', categoria='otro')
        caja_quimica = crear_caja(id='CAJA-QUIMICA', categoria='quimico')
        plan = OptimizadorUbicaciones.recomendar_lote([caja_general, caja_quimica])
        self.assertEqual(plan['CAJA-QUIMICA'][0], quimica)
        self.assertEqual(plan['CAJA-GENERAL'][0], general)

    def test_matching_global_maximiza_cantidad_asignada(self):
        protegida = crear_ubicacion(
            pasillo='A', estante=1, permite_fragil=True, distancia_salida_m=1,
        )
        comun = crear_ubicacion(
            pasillo='B', estante=1, permite_fragil=False, distancia_salida_m=12,
        )
        flexible = crear_caja(id='CAJA-FLEXIBLE', es_fragil=False, prioridad='urgente')
        restringida = crear_caja(id='CAJA-FRAGIL', es_fragil=True)
        plan = OptimizadorUbicaciones.recomendar_lote([flexible, restringida])
        self.assertEqual(plan['CAJA-FRAGIL'][0], protegida)
        self.assertEqual(plan['CAJA-FLEXIBLE'][0], comun)
        self.assertEqual(
            plan['CAJA-FRAGIL'][1]['optimizacion_lote'],
            'max_weight_bipartite_matching',
        )

    def test_carga_pesada_fragil_usa_hueco_reforzado_protegido(self):
        protegida = crear_ubicacion(
            pasillo='A', estante=2, nivel=1, tipo_estante='pesado',
            capacidad_peso_kg=250, permite_fragil=True,
        )
        crear_ubicacion(
            pasillo='A', estante=2, nivel=2, tipo_estante='pesado',
            capacidad_peso_kg=250, permite_fragil=False,
        )
        caja = crear_caja(peso_kg=Decimal('80'), es_fragil=True)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja,
        )
        self.assertEqual(result, protegida)

    def test_quimico_fragil_permanece_en_contencion_quimica(self):
        protegida = crear_ubicacion(
            pasillo='B', estante=1, tipo_estante='quimico',
            permite_quimico=True, permite_fragil=True,
        )
        crear_ubicacion(pasillo='A', estante=1, permite_fragil=True)
        caja = crear_caja(categoria='quimico', es_fragil=True)
        result = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
            ClasificadorCajas.clasificar(caja), caja=caja,
        )
        self.assertEqual(result, protegida)


# ─── Tests del RutaService ────────────────────────────────────────────────────

@override_settings(ALWAYS_LONG_ROUTES=False)
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
        self.usuario = Usuario.objects.create(nombre='Test Op', rol='operador', usuario_auth=user)

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

    def test_no_reprocesa_caja_ya_en_transito(self):
        actual = crear_ubicacion(estado_ocupacion=True)
        alternativa = crear_ubicacion(pasillo='B', estante=1)
        caja = crear_caja(
            id='CAJA-EN-RUTA', estado='en_transito', id_ubicacion=actual,
            medida=self.medida, proveedor=self.proveedor,
        )
        res = self.client.post(
            f'/api/cajas/{caja.id}/procesar/',
            content_type='application/json',
            data={},
        )
        self.assertEqual(res.status_code, 400)
        caja.refresh_from_db()
        actual.refresh_from_db()
        alternativa.refresh_from_db()
        self.assertEqual(caja.id_ubicacion, actual)
        self.assertTrue(actual.estado_ocupacion)
        self.assertFalse(alternativa.estado_ocupacion)


class BatchPreviewAndOverrideTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.create_user(username='test_batch_user', password='password')
        self.client.force_login(user)
        self.medida = crear_medida()
        self.proveedor = crear_proveedor()
        self.usuario = Usuario.objects.create(nombre='Test Op', rol='operador', usuario_auth=user)
        self.ubi_sugerida = crear_ubicacion(
            pasillo='A', estante=1, nivel=2, distancia_salida_m=2,
        )
        self.ubi_manual = crear_ubicacion(
            pasillo='B', estante=2, nivel=2, distancia_salida_m=14,
        )
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

    def test_previsualizacion_reserva_sugerencias_unicas(self):
        crear_caja(
            id='CAJA-BATCH-002', medida=self.medida, proveedor=self.proveedor,
        )
        res = self.client.post('/api/cajas/previsualizar_lote/', content_type='application/json', data={})
        self.assertEqual(res.status_code, 200)
        sugeridas = [caja['sugerida_id'] for caja in res.json()['cajas']]
        self.assertEqual(len(sugeridas), len(set(sugeridas)))

    def test_override_incompatible_rechaza_todo_el_lote(self):
        self.caja.es_fragil = True
        self.caja.save(update_fields=['es_fragil'])
        self.ubi_manual.permite_fragil = False
        self.ubi_manual.save(update_fields=['permite_fragil'])
        res = self.client.post('/api/cajas/procesar_lote/', content_type='application/json', data={
            'asignaciones': {'CAJA-BATCH-001': self.ubi_manual.id_ubicacion},
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'invalid_manual_assignment')
        self.caja.refresh_from_db()
        self.ubi_manual.refresh_from_db()
        self.assertEqual(self.caja.estado, 'pendiente')
        self.assertIsNone(self.caja.id_ubicacion)
        self.assertFalse(self.ubi_manual.estado_ocupacion)

    def test_override_duplicado_rechaza_todo_el_lote(self):
        segunda = crear_caja(
            id='CAJA-BATCH-002', medida=self.medida, proveedor=self.proveedor,
        )
        res = self.client.post('/api/cajas/procesar_lote/', content_type='application/json', data={
            'asignaciones': {
                'CAJA-BATCH-001': self.ubi_manual.id_ubicacion,
                'CAJA-BATCH-002': self.ubi_manual.id_ubicacion,
            },
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'duplicate_manual_location')
        self.caja.refresh_from_db()
        segunda.refresh_from_db()
        self.assertEqual(self.caja.estado, 'pendiente')
        self.assertEqual(segunda.estado, 'pendiente')


class WarehouseAuditCommandTests(TestCase):

    def setUp(self):
        self.invalida = crear_ubicacion(
            pasillo='A', estante=1, capacidad_peso_kg=Decimal('5'),
            estado_ocupacion=True,
        )
        self.valida = crear_ubicacion(
            pasillo='B', estante=1, capacidad_peso_kg=Decimal('100'),
        )
        self.caja = crear_caja(
            id='CAJA-AUDIT-001', peso_kg=Decimal('20'), estado='almacenada',
            id_ubicacion=self.invalida,
        )

    def test_diagnostico_no_modifica_datos(self):
        salida = StringIO()
        call_command('audit_warehouse_slotting', stdout=salida)
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.id_ubicacion, self.invalida)
        self.assertIn('Asignaciones incompatibles/duplicadas: 1', salida.getvalue())

    def test_apply_reubica_y_reconcilia_ocupacion(self):
        call_command('audit_warehouse_slotting', '--apply', stdout=StringIO())
        self.caja.refresh_from_db()
        self.invalida.refresh_from_db()
        self.valida.refresh_from_db()
        self.assertEqual(self.caja.id_ubicacion, self.valida)
        self.assertFalse(self.invalida.estado_ocupacion)
        self.assertTrue(self.valida.estado_ocupacion)


class DespachoLoteTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.create_user(username='batch_dispatch_user', password='password')
        self.client.force_login(user)
        self.usuario = Usuario.objects.create(nombre='Batch Dispatch', rol='operador', usuario_auth=user)
        medida = crear_medida()
        proveedor = crear_proveedor()
        self.ubicacion = crear_ubicacion()
        self.caja = crear_caja(id='CAJA-LOTE-001', cantidad=3, estado='almacenada', medida=medida, proveedor=proveedor, id_ubicacion=self.ubicacion)
        self.ubicacion.estado_ocupacion = True
        self.ubicacion.save(update_fields=['estado_ocupacion'])

    def test_reintento_con_misma_clave_no_duplica_salida(self):
        payload = {'items': [{'caja': self.caja.id, 'cantidad': 2}], 'destino': 'Norte', 'transporte_placa': 'ABC-123', 'idempotency_key': 'operacion-prueba-1'}
        first = self.client.post('/api/inventario/despachar_lote/', data=payload, content_type='application/json')
        retry = self.client.post('/api/inventario/despachar_lote/', data=payload, content_type='application/json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(retry.status_code, 200)
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.cantidad, 1)
        self.assertEqual(Despacho.objects.count(), 1)

    def test_lote_invalido_no_aplica_parcialmente(self):
        payload = {'items': [{'caja': self.caja.id, 'cantidad': 1}, {'caja': 'CAJA-INEXISTENTE', 'cantidad': 1}], 'destino': 'Norte', 'transporte_placa': 'ABC-123', 'idempotency_key': 'operacion-prueba-2'}
        response = self.client.post('/api/inventario/despachar_lote/', data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 409)
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.cantidad, 3)
        self.assertEqual(Despacho.objects.count(), 0)


class CatalogoAdminCrudTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        self.User = get_user_model()
        self.admin = self.User.objects.create_user(username='crud_admin', password='password', is_staff=True)
        self.admin_profile = Usuario.objects.create(nombre='CRUD Admin', rol='admin', usuario_auth=self.admin)
        self.client.force_login(self.admin)

    def test_crud_usuario_desactiva_sin_borrar_trazabilidad(self):
        create_response = self.client.post('/api/usuarios/', data={
            'nombre': 'Operador CRUD', 'username': 'operador_crud',
            'email': 'operador@local.test', 'rol': 'operador', 'password': 'password-seguro',
        }, content_type='application/json')
        self.assertEqual(create_response.status_code, 201)
        user_id = create_response.json()['id_usuario']
        update_response = self.client.patch(f'/api/usuarios/{user_id}/', data={'nombre': 'Operador Actualizado', 'rol': 'despachador'}, content_type='application/json')
        self.assertEqual(update_response.status_code, 200)
        delete_response = self.client.delete(f'/api/usuarios/{user_id}/')
        self.assertEqual(delete_response.status_code, 204)
        profile = Usuario.objects.get(pk=user_id)
        self.assertFalse(profile.usuario_auth.is_active)

    def test_crud_medida_calcula_volumen(self):
        create_response = self.client.post('/api/medidas/', data={'nombre':'QA 2x3x4','largo':2,'ancho':3,'alto':4,'volumen':0}, content_type='application/json')
        self.assertEqual(create_response.status_code, 201)
        measure_id = create_response.json()['id_medida']
        self.assertEqual(float(create_response.json()['volumen']), 24.0)
        update_response = self.client.patch(f'/api/medidas/{measure_id}/', data={'alto':5}, content_type='application/json')
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(float(update_response.json()['volumen']), 30.0)
        delete_response = self.client.delete(f'/api/medidas/{measure_id}/')
        self.assertEqual(delete_response.status_code, 204)


