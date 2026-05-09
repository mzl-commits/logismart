# TODO - Mejora de asignación automática de cajas

## Fase 1 (hecho)
- [x] Extender modelo `Ubicacion` con metadatos de estante:
  - [x] `tipo_estante`
  - [x] `capacidad_peso_kg`
  - [x] `permite_fragil`
  - [x] `permite_quimico`
  - [x] `prioridad_categoria`
- [x] Actualizar `serializers.py` para exponer nuevos campos.
- [x] Actualizar `admin.py` para gestionar nuevos metadatos desde panel admin.
- [x] Mejorar `services/optimizador.py`:
  - [x] Validar compatibilidad de ubicación con caja/clasificación.
  - [x] Calcular score logístico con nuevas reglas.
  - [x] Devolver motivo y puntaje de recomendación.
- [x] Actualizar `views.py` (`CajaViewSet.procesar`) para incluir explicación de recomendación en respuesta.
- [x] Actualizar templates/frontend para mostrar metadatos y recomendación:
  - [x] `templates/clasificacion/almacen_visual.html`
- [x] Generar/aplicar migración de Django para nuevos campos.

## Fase 2 (actual)
- [ ] Poblar/normalizar estantes con variedad real de tipos y reglas logísticas.
- [ ] Crear endpoint de previsualización de recomendación al registrar caja.
- [ ] Mostrar recomendación en frontend al registrar/visualizar caja pendiente.
- [ ] Probar ruta crítica de endpoints y UI.
