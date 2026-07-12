"""API REST agrupada por dominio funcional."""

from .common import (
    Categoria, CategoriaSerializer,
    Destino, DestinoSerializer, HistorialMovimientos, HistorialSerializer,
    Medida, MedidaSerializer, Proveedor, ProveedorSerializer, Response,
    Ubicacion, UbicacionSerializer, Usuario, UsuarioSerializer,
    Vehiculo, VehiculoSerializer,
    action, viewsets,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from ..permissions import IsAdminOrReadOnly

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [IsAdminOrReadOnly]


class DestinoViewSet(viewsets.ModelViewSet):
    queryset = Destino.objects.all()
    serializer_class = DestinoSerializer
    permission_classes = [IsAdminOrReadOnly]
class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    pagination_class = None
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        libres = self.queryset.filter(estado_ocupacion=False)
        return Response(UbicacionSerializer(libres, many=True).data)


class MedidaViewSet(viewsets.ModelViewSet):
    queryset = Medida.objects.all()
    serializer_class = MedidaSerializer
    permission_classes = [IsAdminOrReadOnly]


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAdminOrReadOnly]


class UsuarioViewSet(viewsets.ReadOnlyModelViewSet):
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
