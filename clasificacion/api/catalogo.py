"""API REST agrupada por dominio funcional."""

from .common import (
    Categoria, CategoriaSerializer, ConfigCarro, ConfigCarroSerializer,
    Destino, DestinoSerializer, HistorialMovimientos, HistorialSerializer,
    Medida, MedidaSerializer, Proveedor, ProveedorSerializer, Response,
    Ubicacion, UbicacionSerializer, Usuario, UsuarioSerializer, Vehiculo,
    VehiculoSerializer, action, viewsets,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class DestinoViewSet(viewsets.ModelViewSet):
    queryset = Destino.objects.all()
    serializer_class = DestinoSerializer


class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    pagination_class = None

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        libres = self.queryset.filter(estado_ocupacion=False)
        return Response(UbicacionSerializer(libres, many=True).data)


class MedidaViewSet(viewsets.ModelViewSet):
    queryset = Medida.objects.all()
    serializer_class = MedidaSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class ConfigCarroViewSet(viewsets.ModelViewSet):
    """Configuración de carros. Soporta carro_id dinámico."""
    serializer_class = ConfigCarroSerializer

    def get_queryset(self):
        return ConfigCarro.objects.all()

    def get_object(self):
        pk = self.kwargs.get('pk')
        if pk:
            try:
                return ConfigCarro.objects.get(pk=pk)
            except ConfigCarro.DoesNotExist:
                return ConfigCarro.get_config(int(pk))
        carro_id = int(self.request.query_params.get('carro_id', 1))
        return ConfigCarro.get_config(carro_id)

    @action(detail=False, methods=['get'])
    def actual(self, request):
        carro_id = int(request.query_params.get('carro_id', 1))
        config = ConfigCarro.get_config(carro_id)
        return Response(ConfigCarroSerializer(config).data)

    @action(detail=False, methods=['patch', 'put'])
    def actualizar(self, request):
        carro_id = int(request.query_params.get('carro_id', 1))
        config = ConfigCarro.get_config(carro_id)
        serializer = ConfigCarroSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer


class HistorialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialMovimientos.objects.all().order_by('-fecha_cambio')
    serializer_class = HistorialSerializer



@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    if request.user.is_authenticated:
        return Response({
            'is_authenticated': True,
            'username': request.user.username,
            'is_superuser': request.user.is_superuser,
        })
    return Response({
        'is_authenticated': False,
        'username': '',
        'is_superuser': False,
    })
