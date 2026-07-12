# Diagnostico funcional y plan de mejora

Fecha de analisis: 2026-07-11

## Actualizacion de ejecucion

Las correcciones P0 y de autorizacion descritas en este informe fueron
implementadas despues del diagnostico. Se retiro el catalogo de vehiculos, se
reparo `previsualizar_lote`, se vinculo el perfil logistico con `auth.User` y
la escritura de maestros quedo restringida a administradores. La validacion
posterior termino con 48 pruebas backend aprobadas, `npm run lint` y `npm run
build` correctos, y migraciones sin cambios pendientes.

## Objetivo y alcance

Se evaluo LogiSmart como sistema de clasificacion, almacenamiento, inventario,
planillas y despacho. El analisis cubrio interfaz web autenticada, API, modelo
de datos, permisos, pruebas automatizadas, configuracion de despliegue y
experiencia de operacion. No se enviaron formularios que creen, modifiquen o
eliminen datos de produccion.

## Metodo iterativo aplicado

| Ciclo | Accion | Evidencia | Resultado |
| --- | --- | --- | --- |
| 1 | Recorrido web autenticado | `/`, `/almacen`, `/stock`, `/despachos`, `/planillas`, `/nueva-caja`, `/administracion`, `/suscripcion` | Todas las rutas cargaron sin bloqueo inicial. |
| 2 | Revision de consola y API de Administracion | Consola del navegador y consultas autenticadas a catalogos | Administracion muestra un 500 por falta de tabla `vehiculo`. |
| 3 | Ejecucion completa de pruebas | `python manage.py test -v 1` | 45 de 46 pruebas aprobaron; falla `previsualizar_lote`. |
| 4 | Revision de modelo, vistas y permisos | Modelos, ViewSets, tests y rutas | Se confirmaron transiciones, inventario reservado, planillas y brechas de autorizacion. |
| 5 | Revision de produccion y contrato API | `python manage.py check --deploy` | Configuracion local de desarrollo activa y avisos de esquema OpenAPI incompleto. |

## Estado actual de uso

### Flujo web observado

El panel principal presenta 8 cajas activas, 1 en transito, 7 almacenadas y
ocupacion fisica de 8/72 ubicaciones. La navegacion principal permite llegar a
almacen, stock, despachos y planillas. El buscador y los filtros de estado y
categoria estan presentes en el panel.

La interfaz carga las pantallas operativas sin errores de JavaScript, salvo:

- Dos avisos de graficos con tamano negativo en Dashboard. No bloquean la
  pantalla, pero pueden dejar graficos vacios en ciertos breakpoints.
- Un error Axios 500 al abrir Administracion.

### Fallo reproducible de Administracion

La pantalla carga usuarios y proveedores, pero una de sus cuatro solicitudes
falla. La comprobacion autenticada identifica el origen:

```text
GET /api/vehiculos/ -> 500
sqlite3.OperationalError: no such table: vehiculo
```

Esto bloquea la carga agrupada de Administracion porque el frontend usa
`Promise.all`. Aunque tres catalogos respondan, la pantalla entra en el camino
de error. El modelo `Vehiculo` existe y el endpoint esta registrado, por lo que
la base local esta desalineada con las migraciones.

## Reglas de negocio confirmadas

### Caja y almacenamiento

| Regla | Evidencia | Estado |
| --- | --- | --- |
| Una caja tiene prioridad baja, media, alta o urgente. | `clasificacion/models.py` | Confirmada. |
| Una caja transita por pendiente, clasificada, en_transito, almacenada y despachada. | `clasificacion/models.py` | Confirmada. |
| Solo una caja en `en_transito` puede confirmarse como almacenada. | `CajaViewSet.confirmar_almacenada` | Confirmada. |
| Solo una caja almacenada puede confirmarse como despachada. | `CajaViewSet.confirmar_despacho` | Confirmada. |
| El procesamiento de lote asigna ubicacion compatible, cambia estado y registra historial. | `CajaViewSet.procesar_lote` y tests de lote | Confirmada. |
| La ubicacion se libera cuando sale una caja despachada. | `InventoryViewSet.despachar` y pruebas de inventario | Confirmada. |
| El procesamiento por lote limita la cantidad a 1..100 mediante el campo `limite`. | `CajaViewSet.procesar_lote` | Confirmada. |

### Inventario y despacho

| Regla | Evidencia | Estado |
| --- | --- | --- |
| Una reserva no reduce el fisico; reduce el disponible. | `InventoryViewSet.reservar` y `tests_inventory.py` | Confirmada. |
| No se permite reservar ni despachar mas cantidad que la disponible. | `InventoryViewSet.reservar/despachar` | Confirmada. |
| El despacho parcial conserva la caja; el total la marca como despachada. | `tests_inventory.py` | Confirmada. |
| Los cambios de inventario crean movimientos de entrada, salida, reserva, liberacion, traslado o ajuste. | `MovimientoInventario` | Confirmada. |
| El despacho API v1 exige caja, destino, placa y usuario responsable. | `DespachoV1CreateView` | Confirmada. |

### Planillas y solicitudes

| Regla | Evidencia | Estado |
| --- | --- | --- |
| Una solicitud puede ser pendiente, aprobada o rechazada. | `SolicitudDespacho` | Confirmada. |
| Solo un superusuario puede aprobar o rechazar solicitudes. | `SolicitudDespachoViewSet.aprobar/rechazar` | Confirmada. |
| Un operador ve sus propias planillas; staff/superuser ven todas. | `PlanillaViewSet.get_queryset` y API movil | Confirmada. |
| Una planilla solo puede completarse una vez y por su operador o un administrador. | `PlanillaViewSet.completar` | Confirmada. |

## Roles y autorizacion

Hay dos conceptos de usuario que deben unificarse o mapearse explicitamente:

1. `auth.User`: autentica la web, API y aplicacion movil; usa `is_staff`,
   `is_superuser` y grupos.
2. `clasificacion.Usuario`: representa el responsable logistico del historial
   y despacho; sus roles son `admin`, `operador` y `despachador`.

| Capacidad | Usuario autenticado | Operador de planilla | Staff | Superusuario |
| --- | --- | --- | --- | --- |
| Consultar API interna | Si | Si | Si | Si |
| Consultar planillas propias | Si, si es asignado | Si | Si | Si |
| Consultar todas las planillas | No | No | Si | Si |
| Completar planilla propia | Si | Si | Si | Si |
| Aprobar/rechazar solicitud | No | No | No | Si |
| Ajustar inventario | No | No | No | Si |
| Crear, editar o borrar catalogos | Actualmente si | Actualmente si | Si | Si |

La ultima fila es una brecha: `VehiculoViewSet`, `DestinoViewSet`,
`ProveedorViewSet`, `UsuarioViewSet`, `MedidaViewSet`, `CategoriaViewSet` y
`UbicacionViewSet` heredan la autenticacion global pero no restringen escritura
por rol. Un usuario autenticado puede modificar maestros mediante API aunque la
interfaz los presente como Administracion.

## Hallazgos priorizados

### P0 - Corregir antes de uso operativo

1. **Previsualizacion de lote devuelve 500.**
   `previsualizar_lote` responde variables eliminadas (`peso_acumulado`,
   `volumen_acumulado` y `config`) en `clasificacion/api/cajas.py`.
   Consecuencia: el flujo previo al procesamiento falla y la suite completa no
   es verde. Accion: recalcular esos agregados para las cajas previsualizadas o
   retirar los campos de respuesta y actualizar el contrato y su prueba.

2. **Esquema de base desalineado: falta tabla `vehiculo`.**
   `GET /api/vehiculos/` falla con 500 y bloquea Administracion. Accion:
   respaldar la base, revisar `django_migrations`, ejecutar `python manage.py
   migrate` sobre la base correcta y agregar una comprobacion de salud de
   migraciones al despliegue.

### P1 - Alto impacto de seguridad y operacion

3. **Autorizacion de maestros demasiado amplia.**
   Aplicar `IsAdminOrReadOnly` o permiso equivalente a los ViewSets de
   catalogos y documentar que grupo controla cada accion.

4. **Roles duplicados sin relacion garantizada.**
   Definir una unica fuente de verdad: extender `auth.User`, o enlazar
   `clasificacion.Usuario` mediante `OneToOneField`. Eliminar el fallback que
   toma el primer usuario logistico en un despacho de inventario.

5. **Documentacion OpenAPI incompleta.**
   `check --deploy` informa que no reconoce `MobileTokenAuthentication` y que
   no puede deducir serializers para vistas APIView/ViewSet. Crear una extension
   de drf-spectacular y serializers de respuesta para endpoints moviles,
   inventario y API v1.

6. **Configuracion de produccion no validada en el entorno actual.**
   `check --deploy` detecta `DEBUG=True` y flags HTTPS/HSTS desactivados. Esto
   es correcto para local, pero antes de desplegar debe verificarse con las
   variables de produccion reales.

### P2 - Experiencia y mantenibilidad

7. **Graficos con contenedor invalido.**
   Recharts advierte ancho/alto `-1`. Definir alto minimo y contenedor con
   dimensiones estables; probar desktop y movil.

8. **Administracion usa carga atomica innecesaria.**
   `Promise.all` impide mostrar los tres catalogos sanos si uno falla. Usar
   `Promise.allSettled` y un estado de error por panel.

9. **Paginacion sin orden estable en catalogos.**
   Django advierte `UnorderedObjectListWarning` para usuarios, proveedores y
   vehiculos. Definir `Meta.ordering` o `queryset.order_by`.

10. **Pruebas faltantes de autorizacion.**
    No hay cobertura que pruebe que operador/despachador no puede editar
    maestros, aprobar solicitudes, ajustar inventario o ver planillas ajenas.

## Datos que deben recolectarse para mejorar

| Area | Dato | Uso de mejora | Periodicidad |
| --- | --- | --- | --- |
| Recepcion | cajas por estado y tiempo hasta almacenada | Detectar cuellos de botella | Diario |
| Ubicaciones | ocupacion por pasillo, nivel, categoria y peso | Ajustar reglas de clasificacion | Diario |
| Inventario | disponible, reservado, fisico y quiebres | Validar reservas y minimos | Diario |
| Despacho | cantidad parcial/total, destino, placa y operador | Medir cumplimiento y trazabilidad | Por despacho |
| Planillas | asignadas, completadas, vencidas y reabiertas | Balancear carga de operadores | Diario |
| Errores | codigo HTTP, endpoint, rol y causa | Priorizar fallos de producto | Continuo |
| Seguridad | intentos 401/403, uso API v1 y cambios de maestro | Auditoria de acceso | Continuo |
| UX | abandono de formularios, tiempo por tarea y errores de validacion | Simplificar pantallas | Semanal |

No registrar secretos, tokens, contrasenas ni cuerpos completos de solicitudes
en logs de producto.

## Plan de pruebas recomendado

1. Corregir P0 y repetir `python manage.py test`; criterio: 46/46 o mas,
   sin errores.
2. Ejecutar matriz de roles con admin, operador, despachador y usuario sin
   privilegios contra cada endpoint de escritura.
3. Probar lote con cero, una, veinte y mas de cien cajas; incluir caja fragil,
   quimica, sin ubicacion y sobrepeso.
4. Probar dos reservas y dos despachos concurrentes sobre la misma caja.
5. Verificar en movil autenticacion Bearer, planillas propias y rechazo de
   planillas ajenas.
6. Validar dashboard y formularios en escritorio y movil; confirmar que los
   graficos no emitan avisos ni queden vacios.
7. Ejecutar `python manage.py check --deploy` con variables reales de
   produccion antes del siguiente despliegue.

## Criterios de aceptacion operativa

- No existen respuestas 500 en flujos de caja, lote, administracion, inventario
  ni despacho.
- Todas las migraciones estan aplicadas en cada ambiente.
- La suite de pruebas es verde y cubre permisos por rol.
- Un usuario no administrador no puede cambiar maestros ni ajustar inventario.
- Cada cambio de cantidad, estado y ubicacion deja trazabilidad suficiente.
- Las metricas propuestas se pueden extraer sin exponer datos sensibles.
