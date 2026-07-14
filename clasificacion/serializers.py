# clasificacion/serializers.py
from rest_framework import serializers
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    Caja, Ubicacion, Medida, Proveedor,
    Usuario, HistorialMovimientos, Despacho, Categoria,
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


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class MedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medida
        fields = '__all__'
        read_only_fields = ['volumen']

    def validate(self, attrs):
        for campo in ('largo', 'ancho', 'alto'):
            valor = attrs.get(campo, getattr(self.instance, campo, None))
            if valor is not None and valor <= 0:
                raise serializers.ValidationError({campo: 'Debe ser mayor que cero.'})
        return attrs


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

    def validate(self, attrs):
        positivos = ('capacidad_peso_kg', 'ancho_util_cm', 'fondo_util_cm', 'alto_util_cm')
        for campo in positivos:
            valor = attrs.get(campo, getattr(self.instance, campo, None))
            if valor is not None and valor <= 0:
                raise serializers.ValidationError({campo: 'Debe ser mayor que cero.'})
        distancia = attrs.get(
            'distancia_salida_m',
            getattr(self.instance, 'distancia_salida_m', None),
        )
        if distancia is not None and distancia < 0:
            raise serializers.ValidationError({
                'distancia_salida_m': 'No puede ser negativa.',
            })
        return attrs


class UsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    activo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre', 'rol', 'username', 'email', 'password', 'activo']

    def get_activo(self, obj):
        return bool(obj.usuario_auth and obj.usuario_auth.is_active)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['username'] = instance.usuario_auth.username if instance.usuario_auth else ''
        data['email'] = instance.usuario_auth.email if instance.usuario_auth else ''
        return data

    def validate(self, attrs):
        username = attrs.get('username')
        if self.instance is None and not username:
            raise serializers.ValidationError({'username': 'El nombre de usuario es obligatorio.'})
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        User = get_user_model()
        current_auth_id = self.instance.usuario_auth_id if self.instance else None
        if username and User.objects.exclude(pk=current_auth_id).filter(username__iexact=username).exists():
            raise serializers.ValidationError({'username': 'Este nombre de usuario ya existe.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        User = get_user_model()
        username = validated_data.pop('username')
        email = validated_data.pop('email', '')
        password = validated_data.pop('password')
        is_admin = validated_data.get('rol') == 'admin'
        auth_user = User.objects.create_user(
            username=username, email=email, password=password,
            is_staff=is_admin, is_superuser=False,
        )
        return Usuario.objects.create(usuario_auth=auth_user, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        username = validated_data.pop('username', None)
        email = validated_data.pop('email', None)
        password = validated_data.pop('password', None)
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.rol = validated_data.get('rol', instance.rol)
        instance.save(update_fields=['nombre', 'rol'])
        auth_user = instance.usuario_auth
        if auth_user:
            if username: auth_user.username = username
            if email is not None: auth_user.email = email
            auth_user.is_staff = instance.rol == 'admin'
            if password: auth_user.set_password(password)
            auth_user.save()
        return instance


class CajaSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.SerializerMethodField()
    producto_sku = serializers.CharField(source='producto_ref.sku', read_only=True)

    class Meta:
        model = Caja
        fields = '__all__'
        read_only_fields = ['id_ubicacion', 'estado', 'hora_llegada']

    def get_ubicacion_nombre(self, obj):
        return str(obj.id_ubicacion) if obj.id_ubicacion else ""

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError('Debe ser mayor que cero.')
        return value

    def validate_peso_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError('Debe ser mayor que cero.')
        return value

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
