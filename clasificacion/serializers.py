# clasificacion/serializers.py
from rest_framework import serializers

from .models import (
    Caja, Ubicacion, Medida, Proveedor,
    Usuario, HistorialMovimientos, Despacho, EstadoCarro, Categoria, ConfigCarro,
    Vehiculo, Destino, SolicitudDespacho, Planilla
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

    class Meta:
        model = Caja
        fields = '__all__'

    def get_ubicacion_nombre(self, obj):
        return str(obj.id_ubicacion) if obj.id_ubicacion else ""


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialMovimientos
        fields = '__all__'


class DespachoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despacho
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
