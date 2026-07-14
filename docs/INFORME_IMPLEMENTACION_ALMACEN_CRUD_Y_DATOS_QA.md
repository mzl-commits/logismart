# Informe de implementación: almacén, catálogos y datos QA

Fecha: 12/07/2026

## Alcance aplicado

- CRUD administrativo de usuarios con cuenta Django y perfil logístico sincronizados.
- Eliminación segura de usuarios mediante desactivación para conservar historial.
- CRUD administrativo de medidas con volumen calculado por el servidor.
- Políticas de stock trasladadas de Stock a Configuración, con alta, edición, listado y eliminación.
- Almacén reorganizado por pasillo, estante, nivel y casillero C1-C4.
- Detalle de cada espacio con capacidad, especialización, compatibilidad y caja asociada.
- Componente visual compartido entre Almacén y el previsualizador de asignación.
- Datos QA persistentes hasta superar el 30% de ocupación.

## Datos generados y conservados

- Ubicaciones totales: 72.
- Ubicaciones ocupadas antes de la prueba: 9.
- Cajas QA creadas, procesadas y almacenadas: 13.
- Ubicaciones ocupadas después de la prueba: 22.
- Ocupación final: 30.6%.
- IDs persistentes: `DEMO-QA-001` a `DEMO-QA-013`.
- Lote: `QA-LOCAL`.

El comando `python manage.py seed_demo_warehouse` es idempotente: si el objetivo de ocupación ya está cumplido, no crea datos adicionales.

## Lazo funcional comprobado

Cada caja siguió el contrato real de la aplicación:

1. `POST /api/cajas/` para registrar la caja.
2. `POST /api/cajas/{id}/procesar/` para clasificar y asignar ubicación compatible.
3. `POST /api/cajas/{id}/confirmar_almacenada/` para cerrar el almacenamiento.
4. Verificación final de estado `almacenada`, ubicación ocupada e historial asociado.

## Hallazgos durante la ejecución

### H-01: host de cliente de prueba rechazado

La primera ejecución usó el host interno `testserver`, no incluido en `ALLOWED_HOSTS`. Django respondió correctamente con `DisallowedHost` y no creó cajas.

Corrección: el comando usa explícitamente `127.0.0.1`, replicando el entorno local real.

### H-02: salida Unicode incompatible con consola Windows

Después de completar las 13 cajas, el resumen intentó imprimir una flecha Unicode y la consola CP1252 produjo `UnicodeEncodeError`. Los datos ya estaban guardados y eran correctos.

Corrección: los mensajes del comando usan caracteres ASCII. La segunda ejecución confirmó idempotencia y terminó sin error.

### H-03: prueba de estado visual desactualizada

La prueba anterior buscaba textos planos `Ocupada` y `Libre`. El nuevo mapa expresa estado mediante clase, icono, leyenda, selección y badge de detalle.

Corrección: la prueba valida casillero seleccionado/libre, badge `Ocupado` y producto asociado.

## Reglas de negocio confirmadas

- Una ubicación solo puede contener una caja activa.
- La ubicación seleccionada debe respetar capacidad, fragilidad, químicos y especialización.
- Los operadores pueden consultar catálogos; solo administradores pueden modificarlos.
- Un usuario con trazabilidad no se elimina físicamente: se desactiva.
- El volumen de una medida es derivado de largo por ancho por alto y no se acepta como dato manual.
- Las políticas de stock son configuración administrativa; Stock solo muestra operación, reservas, alertas y kardex.

## Validaciones

- `python manage.py check`: correcto.
- Pruebas CRUD de usuarios y medidas: correctas.
- Pruebas de idempotencia y rollback de despacho: correctas.
- ESLint y build de producción: correctos.
- Playwright cubre mapa, detalle, móvil, RBAC, políticas y formularios.

## Riesgo residual

Las medidas utilizadas por cajas están protegidas por integridad referencial. Al intentar eliminarlas, el servidor puede rechazar la operación; la interfaz comunica el error y permite conservar el catálogo sin romper cajas históricas.
