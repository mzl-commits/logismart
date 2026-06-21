# clasificacion/serializers.py
from rest_framework import serializers

from .models import (
    Caja, Ubicacion, Medida, Proveedor,
    Usuario, HistorialMovimientos, Despacho, EstadoCarro, Categoria, ConfigCarro,
    Vehiculo, Destino, SolicitudDespacho
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
    class Meta:
        model = Caja
        fields = '__all__'


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