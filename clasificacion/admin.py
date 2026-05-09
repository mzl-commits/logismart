# clasificacion/admin.py
from django.contrib import admin

from .models import (
    Caja, Ubicacion, Medida, Proveedor,
    Usuario, HistorialMovimientos, Despacho,
)


@admin.register(Caja)
class CajaAdmin(admin.ModelAdmin):
    list_display = ['id', 'producto', 'peso_kg', 'prioridad', 'es_fragil', 'estado', 'id_ubicacion']
    list_filter = ['estado', 'prioridad', 'categoria', 'es_fragil']
    search_fields = ['id', 'producto']


@admin.register(Ubicacion)
class UbicacionAdmin(admin.ModelAdmin):
    list_display = [
        'id_ubicacion', 'pasillo', 'estante', 'nivel', 'estado_ocupacion',
        'tipo_estante', 'capacidad_peso_kg', 'permite_fragil', 'permite_quimico', 'prioridad_categoria',
    ]
    list_filter = ['estado_ocupacion', 'pasillo', 'tipo_estante', 'permite_fragil', 'permite_quimico', 'prioridad_categoria']
    search_fields = ['pasillo']


admin.site.register(Medida)
admin.site.register(Proveedor)
admin.site.register(Usuario)
admin.site.register(HistorialMovimientos)
admin.site.register(Despacho)