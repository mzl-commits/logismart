# clasificacion/serializers.py
from rest_framework import serializers
from uuid import uuid4

from .models import (
    Caja, Ubicacion, Medida, Proveedor,
    Usuario, HistorialMovimientos, Despacho, EstadoCarro, Categoria, ConfigCarro,
    Vehiculo, Destino, SolicitudDespacho, Planilla, MovimientoInventario,
    ReservaStock, PoliticaStock, Producto
)

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = '__all__'

class DestinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destino
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'



class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ConfigCarroSerializer(serializers.ModelSerializer):
    volumen_cm3 = serializers.ReadOnlyField()

    class Meta:
        model = ConfigCarro
        fields = '__all__'


class MedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medida
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'


class UbicacionSerializer(serializers.ModelSerializer):
    coord_x = serializers.IntegerField(read_only=True)
    coord_y = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ubicacion
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = '__all__'


class CajaSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.SerializerMethodField()
    producto_sku = serializers.CharField(source='producto_ref.sku', read_only=True)

    class Meta:
        model = Caja
        fields = '__all__'

    def get_ubicacion_nombre(self, obj):
        return str(obj.id_ubicacion) if obj.id_ubicacion else ""

    def create(self, validated_data):
        if not validated_data.get('producto_ref'):
            product, _ = Producto.objects.get_or_create(
                nombre=validated_data['producto'],
                defaults={
                    'sku': f"PRD-{uuid4().hex[:10].upper()}",
                    'categoria': validated_data.get('categoria', 'otro'),
                    'codigo_barras': validated_data.get('codigo_barras'),
                },
            )
            validated_data['producto_ref'] = product
        return super().create(validated_data)


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialMovimientos
        fields = '__all__'


class DespachoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despacho
        fields = '__all__'

class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto = serializers.CharField(source='caja.producto', read_only=True)
    caja_id = serializers.CharField(source='caja.id', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    class Meta:
        model = MovimientoInventario
        fields = '__all__'

class ReservaStockSerializer(serializers.ModelSerializer):
    producto = serializers.CharField(source='caja.producto', read_only=True)
    class Meta:
        model = ReservaStock
        fields = '__all__'
        read_only_fields = ['creada_por', 'estado']

class PoliticaStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaStock
        fields = '__all__'

class ProductoSerializer(serializers.ModelSerializer):
    stock_fisico = serializers.SerializerMethodField()
    def get_stock_fisico(self, obj):
        return sum(obj.lotes.exclude(estado='despachada').values_list('cantidad', flat=True))
    class Meta:
        model = Producto
        fields = '__all__'


class EstadoCarroSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoCarro
        fields = '__all__'


class SolicitudDespachoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudDespacho
        fields = '__all__'
        read_only_fields = ['usuario_solicita']


class PlanillaSerializer(serializers.ModelSerializer):
    operador_nombre = serializers.CharField(source='operador.get_full_name', read_only=True)
    operador_usuario = serializers.CharField(source='operador.username', read_only=True)
    completada_por_nombre = serializers.CharField(source='completada_por.get_full_name', read_only=True)
    total_cajas = serializers.SerializerMethodField()

    class Meta:
        model = Planilla
        fields = [
            'id_planilla', 'cajas_ids', 'total_cajas', 'operador',
            'operador_nombre', 'operador_usuario', 'fecha_creacion',
            'completada', 'fecha_completada', 'completada_por',
            'completada_por_nombre',
        ]
        read_only_fields = ['completada', 'fecha_completada', 'completada_por']

    def get_total_cajas(self, obj):
        return len(obj.cajas_ids or [])
