# Plan detallado de solucion de hallazgos UI/UX y funcionales

**Proyecto:** LogiSmart  
**Fecha:** 12 de julio de 2026  
**Documento de origen:** `INFORME_50_PRUEBAS_FUNCIONALES_UI_UX.md`  
**Proposito:** Explicar como resolver cada hallazgo, en que orden hacerlo y como comprobar que la solucion es correcta.

## 1. Criterios generales de implementacion

Antes de intervenir cada pantalla deben mantenerse estas reglas:

1. El backend es la autoridad de autenticacion, permisos, identidad y reglas de negocio.
2. El frontend puede ocultar acciones por experiencia de usuario, pero nunca sustituye la autorizacion del servidor.
3. Toda operacion que modifica varias entidades debe ser atomica o declarar explicitamente un resultado parcial.
4. Los estados `cargando`, `sin datos`, `error`, `sin permisos` y `correcto` deben ser distintos.
5. Cada cambio debe incluir pruebas del escenario correcto, error de servidor, permiso insuficiente y teclado cuando corresponda.
6. Las credenciales y claves locales existentes no forman parte de estas correcciones y no deben eliminarse.
7. Vehiculos permanece como catalogo logistico. No se reintroduce Arduino, AGV, ESP32 ni MQTT.

## 2. Orden recomendado

| Fase | Objetivo | Hallazgos incluidos |
| --- | --- | --- |
| 1 | Integridad y trazabilidad | Usuario fijo, despacho atomico |
| 2 | Permisos y navegacion | Acciones de Dashboard, paridad movil |
| 3 | Recuperacion ante errores | AsyncState, ErrorBoundary, 404 |
| 4 | Interaccion accesible | Filtros, confirmaciones, estados vacios |
| 5 | Configuracion y visualizacion | Accesibilidad, IA local, Recharts |
| 6 | Calidad continua | OpenAPI, axe, observabilidad, regresion visual |

## 3. Solucion 1: eliminar la atribucion fija `id_usuario: 1`

### Problema

Dashboard envia `id_usuario: 1` al procesar una caja o confirmar su almacenamiento. Esto puede asociar la accion a una persona distinta de quien inicio sesion.

### Archivos afectados

- `logismart-frontend/src/pages/Dashboard.jsx`
- `clasificacion/api/cajas.py`
- Servicios o helpers que resuelven el perfil logistico.
- Pruebas de seguridad y trazabilidad.

### Implementacion backend

1. Localizar las acciones `procesar` y `confirmar_almacenada` del ViewSet de cajas.
2. Obtener siempre el actor desde `request.user`.
3. Resolver su `Usuario` logistico mediante la relacion `usuario_auth`.
4. Si el usuario autenticado no tiene perfil logistico, responder `400` con un codigo estable, por ejemplo `logistic_profile_required`.
5. Ignorar o rechazar cualquier `id_usuario` recibido del navegador. Rechazarlo es preferible porque detecta clientes antiguos y posibles intentos de suplantacion.
6. Guardar el actor resuelto en planillas, historial y movimientos.
7. Ejecutar el cambio de estado y el registro de historial dentro de `transaction.atomic()`.

### Implementacion frontend

1. Retirar `{ id_usuario: 1 }` de las llamadas.
2. Enviar solamente datos propios de la accion, o un cuerpo vacio si no se requiere informacion adicional.
3. Transformar `logistic_profile_required` en un mensaje claro: `Tu cuenta no tiene un perfil operativo asociado. Contacta a un administrador.`
4. No permitir que el usuario elija manualmente a otra persona para atribuir una accion personal.

### Pruebas necesarias

- Usuario A procesa una caja y el historial registra a A.
- Usuario B procesa otra caja y no se reutiliza A.
- Usuario autenticado sin perfil recibe 400 sin modificar la caja.
- Payload con `id_usuario` ajeno no cambia el actor.
- Operacion fallida no deja historial parcial.

### Criterio de aceptacion

No existe ningun ID de usuario fijo en frontend y toda accion queda asociada al usuario autenticado real.

## 4. Solucion 2: convertir el despacho multiple en una operacion atomica

### Problema

Despachos realiza una solicitud por caja. Si una falla en medio del proceso, el lote queda parcialmente despachado.

### Contrato recomendado

Crear `POST /api/inventario/despachar_lote/` con una estructura similar a:

```json
{
  "vehiculo_id": 7,
  "destino_id": 3,
  "items": [
    { "caja": "CAJ-001", "cantidad": 2 },
    { "caja": "CAJ-002", "cantidad": 1 }
  ],
  "idempotency_key": "uuid-generado-por-cliente"
}
```

### Implementacion backend

1. Crear serializer para lote e items anidados.
2. Validar que `items` no este vacio y que no existan cajas duplicadas.
3. Resolver vehiculo y destino por sus IDs internos.
4. Validar todas las cajas antes de modificar una sola: estado almacenada, cantidad disponible, reservas y permisos.
5. Bloquear filas relevantes con `select_for_update()`.
6. Ejecutar movimientos, salidas y actualizaciones dentro de `transaction.atomic()`.
7. Crear un identificador de lote o despacho maestro.
8. Guardar y reutilizar `idempotency_key`; una repeticion debe devolver el resultado original sin duplicar movimientos.
9. Responder 201 con resumen completo o 409/422 con errores por item sin aplicar cambios.

### Implementacion frontend

1. Reemplazar el bucle de solicitudes por una unica llamada.
2. Mostrar un resumen previo con referencias, unidades, peso, vehiculo y destino.
3. Deshabilitar el boton durante el envio.
4. Mantener seleccion y formulario si el servidor rechaza el lote.
5. Al completar, limpiar seleccion y mostrar el identificador del despacho.
6. Para errores por item, resaltar la fila afectada y explicar la causa.

### Pruebas necesarias

- Lote valido modifica todas las cajas.
- Una caja sin stock hace fallar todo el lote sin cambios parciales.
- Doble clic con la misma idempotency key crea un solo lote.
- Dos usuarios intentando despachar la misma caja producen un unico ganador.
- Vehiculo o destino inexistente devuelve validacion antes de modificar inventario.

### Criterio de aceptacion

Un despacho multiple termina completamente o no modifica ninguna caja.

## 5. Solucion 3: alinear acciones internas del Dashboard con RBAC

### Problema

Navbar oculta acciones administrativas a operadores, pero Dashboard sigue mostrando `Nueva caja` y `Agregar`.

### Implementacion

1. Importar `useAuth` en Dashboard.
2. Obtener `isAdmin` desde el contexto global.
3. Renderizar enlaces de alta y botones de procesamiento solo cuando el rol tenga permiso real.
4. Definir una matriz simple de capacidades para evitar condicionales dispersos:

```js
const capabilities = {
  canCreateBoxes: isAdmin,
  canProcessBoxes: isAdmin,
  canViewStock: Boolean(user),
};
```

5. Si se agregan supervisores, derivar capacidades desde permisos enviados por `/api/me/`, no desde nombres de rol codificados en cada pagina.
6. Mantener las rutas protegidas y permisos del backend como segunda barrera.

### Pruebas necesarias

- Administrador ve y usa Nueva caja.
- Operador no encuentra el enlace en Navbar, Dashboard ni menu movil.
- Operador que escribe la URL recibe Acceso Denegado.
- Staff no superusuario obtiene la misma experiencia que autorizan los endpoints.

### Criterio de aceptacion

Ninguna vista ofrece una accion que el mismo usuario no pueda completar.

## 6. Solucion 4: crear estados asincronos uniformes y recuperables

### Problema

Dashboard, Almacen, Configuracion, Planillas y Suscripcion gestionan errores de forma distinta. Algunas quedan vacias, otras solo escriben en consola y otras pueden mantener carga indefinida.

### Componente propuesto

Crear `AsyncState` o componentes separados:

- `LoadingState`: skeleton acorde al contenido.
- `ErrorState`: titulo, explicacion, Reintentar y codigo de soporte.
- `EmptyState`: explica por que no hay datos y cual es la siguiente accion.
- `StaleDataNotice`: conserva datos anteriores si una recarga falla.

### Implementacion por vista

1. Modelar estado con `status: 'idle' | 'loading' | 'success' | 'error'` y `error`.
2. En carga inicial, mostrar skeleton con dimensiones estables.
3. En recarga, conservar datos y mostrar progreso no bloqueante.
4. En `catch`, mapear respuesta con una funcion comun `getApiErrorMessage(error)`.
5. Mostrar Reintentar que invoque exactamente la carga fallida.
6. Tratar 401 como sesion vencida, 403 como permiso, 409 como conflicto, 422/400 como validacion y 500 como error temporal.
7. Generar `X-Correlation-ID` en backend y mostrarlo en detalles de soporte.

### Suscripcion

1. Envolver `/suscripcion/estado/` en `try/catch/finally`.
2. No dejar `loading=true` cuando el fetch falla.
3. Mostrar `No se pudo consultar el estado de facturacion` y Reintentar.
4. No asumir que una respuesta contiene JSON valido.

### Pruebas necesarias

- Error inicial 500 muestra accion Reintentar.
- Reintento exitoso sustituye error por contenido.
- Recarga fallida conserva datos previos.
- Timeout muestra mensaje distinto de permiso denegado.
- Sesion vencida navega al login una sola vez.

### Criterio de aceptacion

El usuario siempre puede distinguir carga, vacio, error y falta de permisos, y dispone de una siguiente accion segura.

## 7. Solucion 5: sustituir confirmaciones nativas

### Problema

Dashboard y Planillas utilizan `window.confirm()`, que bloquea el navegador y no pertenece al sistema visual.

### Implementacion

1. Crear `ConfirmDialog` sobre el Modal accesible existente.
2. Recibir `title`, `description`, `confirmLabel`, `tone`, `busy`, `onConfirm` y `onCancel`.
3. Usar foco inicial en Cancelar para acciones irreversibles; para cambios reversibles puede enfocarse Confirmar.
4. Mostrar entidad concreta: caja, planilla o cantidad.
5. Deshabilitar ambos botones mientras la solicitud se procesa si cerrar pudiera dejar incertidumbre.
6. Cerrar solo despues de respuesta correcta.
7. Si falla, conservar el modal y mostrar el error dentro de el.
8. Restaurar foco al boton que abrio el dialogo.

### Copia recomendada

- Procesar caja: `Enviar CAJ-001 al flujo de almacenamiento`.
- Confirmar almacenada: `Confirmar ubicacion de CAJ-001`.
- Completar planilla: `Marcar Planilla 12 como completada`.

### Pruebas necesarias

- Escape y Cancelar no ejecutan la accion.
- Enter no confirma accidentalmente desde un control secundario.
- Doble clic produce una solicitud.
- Error conserva el dialogo y el foco.
- Lector de pantalla recibe titulo y descripcion.

### Criterio de aceptacion

No quedan llamadas `alert()` ni `confirm()` en el frontend.

## 8. Solucion 6: convertir filtros del Dashboard en controles accesibles

### Problema

Los filtros de estado y categoria son `span` con `onClick`; no se alcanzan con Tab ni exponen seleccion.

### Implementacion

1. Sustituirlos por botones reales.
2. Usar dos grupos con `role="group"` y `aria-label`: Estado y Categoria.
3. Aplicar `aria-pressed={selected}` a cada boton.
4. Mantener texto visible y no depender solo del color.
5. Definir altura minima de 44 px para tactil o un area interactiva equivalente.
6. Conservar foco visible con los tokens del sistema.
7. Anunciar cantidad de resultados en `aria-live="polite"` despues del filtrado.
8. Agregar `Limpiar filtros` cuando algun filtro no sea `all`.

### Pruebas necesarias

- Tab recorre todos los filtros en orden.
- Enter y Espacio cambian seleccion.
- `aria-pressed` refleja el valor actual.
- Alto contraste mantiene seleccion distinguible.
- Paleta apta para daltonismo conserva texto e icono de estado.

### Criterio de aceptacion

El filtrado completo puede realizarse sin mouse y el estado seleccionado se comunica por texto/ARIA y estilo.

## 9. Solucion 7: mostrar estado vacio al filtrar Dashboard

### Problema

Cuando un filtro no encuentra cajas, la tabla queda vacia sin explicacion.

### Implementacion

1. Detectar `filtradas.length === 0` despues de terminar la carga.
2. Renderizar una fila con `colSpan` o un EmptyState fuera de la tabla.
3. Mostrar mensaje contextual: `No hay cajas activas con estado Almacenada y categoria Otro`.
4. Incluir boton `Limpiar filtros`.
5. No usar el mismo mensaje que el estado sin cajas del sistema; filtro vacio y base vacia son situaciones diferentes.

### Pruebas necesarias

- Sin cajas globales explica como registrar la primera.
- Con cajas pero sin coincidencias explica que los filtros excluyen resultados.
- Limpiar filtros restaura filas.
- El mensaje se anuncia despues del cambio.

### Criterio de aceptacion

La tabla nunca aparece como un espacio vacio ambiguo.

## 10. Solucion 8: estabilizar Recharts

### Problema

Playwright detecto advertencias de dimensiones `-1` al montar graficos responsivos.

### Implementacion CSS

1. Asignar al contenedor `width: 100%`, `min-width: 0` y una altura explicita.
2. En grids, asegurar `minmax(0, 1fr)` para evitar mediciones fuera del track.
3. Evitar montar el grafico dentro de un contenedor inicialmente oculto o sin altura.

### Implementacion React

1. Crear un hook `useElementSize` con `ResizeObserver` o usar las opciones de tamaño soportadas por Recharts.
2. Montar `ResponsiveContainer` cuando ancho y alto sean mayores que cero.
3. Mostrar un skeleton del mismo tamaño durante la primera medicion.
4. Definir `minWidth` y `minHeight` si la version de Recharts lo soporta.
5. En `prefers-reduced-motion`, desactivar animacion inicial del grafico.

### Pruebas necesarias

- No se emiten warnings de dimensiones.
- Screenshot contiene pixeles no vacios en el area del grafico.
- Funciona a 390, 768, 1024 y 1440 px.
- Cambiar tamano de ventana recalcula sin desbordar.
- Pestaña inicialmente oculta muestra grafico al activarse.

### Criterio de aceptacion

Los graficos se muestran sin warnings, parpadeos ni lienzos vacios.

## 11. Solucion 9: integrar preferencias de accesibilidad

### Problema

`AccessibilitySettings.jsx` existe, pero no se presenta en Configuracion.

### Implementacion

1. Importar y renderizar `AccessibilitySettings` en `Configuracion.jsx`.
2. Ubicarlo despues de parametros operativos y antes de integraciones locales, o separarlo mediante tabs si Configuracion crece.
3. Confirmar que las preferencias se aplican al iniciar la app antes del primer render para evitar parpadeo.
4. Mantener persistencia local, ya que son preferencias del dispositivo.
5. Agregar una region `aria-live` breve para confirmar cambios importantes.
6. Asegurar que Restablecer devuelve los tres valores a falso y actualiza clases inmediatamente.

### Pruebas necesarias

- Activar contraste agrega `a11y-contrast`.
- Activar paleta segura agrega `a11y-color-safe`.
- Reducir movimiento agrega `a11y-reduce-motion`.
- Recargar conserva preferencias.
- Restablecer elimina clases y almacenamiento vuelve a defaults.

### Criterio de aceptacion

Las tres preferencias son localizables, operables por teclado, persistentes y verificables visualmente.

## 12. Solucion 10: corregir paridad de navegacion movil

### Problema

Suscripcion aparece para todos en escritorio, pero en movil esta dentro del bloque `isAdmin`.

### Implementacion

1. Definir una sola lista de enlaces comunes y otra de enlaces administrativos.
2. Reutilizar esas listas para escritorio y movil.
3. Mantener Suscripcion dentro de enlaces comunes.
4. Mantener Administracion, Configuracion y Nueva caja dentro de capacidades administrativas.
5. Evitar duplicar JSX de enlaces; un componente `NavigationLinks` reduce divergencia futura.
6. Cerrar menu despues de navegar y devolver foco al boton de menu cuando corresponda.

### Pruebas necesarias

- Operador movil ve Dashboard, Almacen, Stock, Despachos, Planillas y Suscripcion.
- Operador movil no ve Nueva caja, Administracion ni Configuracion.
- Administrador movil ve todos los enlaces autorizados.
- Desktop y movil comparten etiquetas y destinos.

### Criterio de aceptacion

El mismo usuario dispone de las mismas capacidades funcionales independientemente del ancho de pantalla.

## 13. Solucion 11: agregar pagina 404

### Problema

No existe una ruta comodin; una URL desconocida puede dejar el area principal vacia.

### Implementacion

1. Crear `NotFound.jsx` con titulo `Pagina no encontrada`.
2. Mostrar la ruta solicitada solo si no contiene datos sensibles.
3. Ofrecer `Volver al Dashboard` y `Buscar caja`.
4. Agregar `<Route path="*" element={<NotFound />} />` al final de Routes.
5. Mantener Navbar para usuarios autenticados.
6. Para rutas publicas desconocidas, evitar redireccionamientos circulares al login.
7. Configurar Django para entregar el shell SPA en rutas frontend validas y conservar 404 real para API/archivos.

### Pruebas necesarias

- `/ruta-inexistente` muestra 404.
- Volver al Dashboard funciona.
- `/api/inexistente` sigue respondiendo 404 JSON, no HTML SPA.
- Recargar la ruta 404 no produce error del servidor.

### Criterio de aceptacion

Ninguna ruta desconocida deja una pantalla vacia y la API conserva sus respuestas 404 correctas.

## 14. Solucion 12: validar configuracion de IA local

### Problema

Endpoint y modelo de Ollama se guardan sin validacion.

### Reglas recomendadas

- Endpoint obligatorio cuando IA local esta activa.
- Protocolos permitidos: `http` y `https`.
- Bloquear credenciales embebidas en URL.
- Modelo obligatorio y sin espacios de control.
- Mostrar advertencia si el host no es local o no pertenece a una lista autorizada.

### Implementacion

1. Crear `validateLocalAiConfig(config)` que devuelva errores por campo.
2. Construir URL con `new URL()` dentro de `try/catch`.
3. Mostrar `aria-invalid` y `aria-describedby` en endpoint y modelo.
4. Impedir Guardar mientras existan errores.
5. Normalizar URL quitando slash final cuando corresponda.
6. Guardar solo despues de validacion.
7. Mantener Probar conexion como accion independiente.
8. Aplicar timeout mediante `AbortController`.
9. Distinguir host inaccesible, CORS, modelo ausente y respuesta invalida.

### Seguridad

No guardar tokens en este formulario. Si en el futuro Ollama usa autenticacion, las credenciales deben residir en backend o almacenamiento seguro, no en `localStorage`.

### Pruebas necesarias

- URL invalida muestra error sin guardar.
- Modelo vacio muestra error.
- Timeout recupera el boton.
- Conexion correcta lista modelos.
- Modelo no instalado muestra advertencia, no exito falso.

### Criterio de aceptacion

Solo configuraciones validas se persisten y cada fallo de conexion tiene una explicacion accionable.

## 15. Integraciones recomendadas y procedimiento

### 15.1 Sentry u OpenTelemetry

1. Elegir Sentry para adopcion rapida u OpenTelemetry para una estrategia mas amplia.
2. Crear entornos separados para desarrollo, staging y produccion.
3. Configurar un `ErrorBoundary` alrededor de rutas lazy.
4. Capturar excepciones no controladas y rechazos de promesas.
5. Incluir version/commit como release.
6. Enviar un identificador de usuario no sensible y rol, nunca credenciales.
7. Filtrar payloads de cajas, contactos y claves.
8. Propagar `X-Correlation-ID` entre frontend y Django.
9. Crear alertas por tasa de error, no por cada evento individual.

**Aceptacion:** un error simulado en staging aparece con ruta, release y correlation ID sin exponer secretos.

### 15.2 Cliente generado desde OpenAPI

1. Validar que `/api/schema/` describe todos los endpoints usados.
2. Corregir operation IDs duplicados o schemas incompletos.
3. Elegir Orval u OpenAPI Generator.
4. Generar cliente en una carpeta separada y no editarlo manualmente.
5. Crear wrappers de dominio para mantener mensajes y transformaciones locales.
6. Migrar modulo por modulo: sesion, catalogos, cajas, inventario, planillas.
7. Regenerar en CI y fallar si quedan diferencias sin confirmar.
8. Ejecutar pruebas de contrato contra staging.

**Aceptacion:** cambiar un campo obligatorio del backend rompe CI antes del despliegue.

### 15.3 axe-core con Playwright

1. Instalar `@axe-core/playwright`.
2. Crear helper que espere fin de carga y ejecute Axe.
3. Cubrir Login, Dashboard, Almacen, Stock, Nueva Caja, Despachos, Administracion, Configuracion y Planillas.
4. Fallar por impactos `critical` y `serious`.
5. Documentar excepciones con responsable y fecha de retiro.
6. Ejecutar en tema claro, oscuro y alto contraste.

**Aceptacion:** la suite no contiene exclusiones permanentes sin justificacion.

### 15.4 MSW para mocks compartidos

1. Definir handlers por dominio en `tests/mocks`.
2. Reutilizar factories de cajas, usuarios, vehiculos y stock.
3. Compartir handlers entre pruebas de componentes y Playwright cuando sea viable.
4. Crear variantes `success`, `empty`, `forbidden`, `validationError` y `serverError`.
5. Evitar patrones de ruta que intercepten modulos como `/src/api/`.

**Aceptacion:** el contrato mock existe en un solo lugar y no duplica IDs/campos entre suites.

### 15.5 Regresion visual

1. Elegir vistas estables y datos deterministas.
2. Fijar fecha, zona horaria, animaciones y fuentes durante screenshots.
3. Capturar desktop, tableta y movil.
4. Capturar temas claro/oscuro y contraste reforzado.
5. Definir umbral pequeno y revisar diferencias en PR.
6. Agregar comprobacion de pixeles para graficos y mapas.

**Aceptacion:** un solapamiento o grafico en blanco falla antes de integrar cambios.

### 15.6 SSE para actualizacion operativa

1. Definir eventos: `box.updated`, `stock.changed`, `location.changed`, `dispatch.created`.
2. Autorizar el stream con la sesion existente.
3. Incluir numero de version o secuencia para detectar eventos perdidos.
4. Actualizar cache local sin recargar toda la pagina.
5. Reconectar con backoff y mostrar estado de sincronizacion.
6. Mantener polling lento como fallback.

**Aceptacion:** dos sesiones ven un cambio de stock sin refrescar y convergen al mismo estado.

### 15.7 Escaneo de codigos

1. Soportar lectores keyboard-wedge primero porque requieren poca dependencia.
2. Detectar secuencia rapida terminada en Enter sin capturar escritura normal.
3. Ofrecer camara con `BarcodeDetector` solo cuando exista soporte y permiso.
4. Mantener campo manual siempre disponible.
5. Evitar crear dos cajas por doble lectura mediante debounce e idempotencia.

**Aceptacion:** lector, camara y entrada manual producen el mismo payload validado.

### 15.8 PWA e idempotencia

1. Confirmar primero la necesidad operativa de trabajo sin conexion.
2. Hacer cache solo del shell y catalogos no sensibles necesarios.
3. No guardar credenciales ni documentos privados en cache publica.
4. Asignar idempotency key a operaciones en cola.
5. Mostrar pendientes de sincronizar, errores y conflictos.
6. Permitir cancelar o reintentar conscientemente.
7. Reconciliar contra el servidor antes de marcar exito.

**Aceptacion:** repetir sincronizacion no duplica cajas, reservas ni despachos.

## 16. Matriz de pruebas posterior

| Area | Prueba minima posterior |
| --- | --- |
| Identidad | Actor autenticado real, sin IDs fijos |
| Despacho | Atomicidad, concurrencia e idempotencia |
| RBAC | Navbar, Dashboard, movil, URL directa y API |
| Errores | 401, 403, 409, 422, 500, timeout y reintento |
| Confirmacion | Escape, foco, doble envio y error interno |
| Filtros | Teclado, ARIA, vacio y limpiar |
| Graficos | Sin warnings, responsive y pixeles no vacios |
| Accesibilidad | Persistencia, alto contraste y axe-core |
| IA local | URL, timeout, CORS y modelo ausente |
| Navegacion | Paridad movil y pagina 404 |

## 17. Definicion de terminado

El plan puede considerarse completado cuando:

- No existen IDs de usuario fijos ni confirmaciones nativas.
- El despacho multiple es atomico e idempotente.
- Acciones visibles y permisos backend coinciden en todas las vistas.
- Todas las cargas tienen estados loading, empty, error y retry.
- Filtros son accesibles por teclado y muestran estado vacio.
- Recharts no emite warnings y se comprueba visualmente.
- Preferencias de accesibilidad son visibles y persistentes.
- Navegacion movil conserva las mismas capacidades que escritorio.
- Existe una ruta 404 funcional.
- IA local valida sus valores antes de guardar.
- Las 54 pruebas Playwright existentes siguen pasando y se agregan las nuevas pruebas descritas.
- Lint, build, pruebas Django y controles de accesibilidad quedan en verde.
# Estado de implementacion

La primera tanda del plan fue aplicada el 12/07/2026:

- Identidad del operador: `procesar_lote`, `procesar`, `confirmar_almacenada` y `confirmar_despacho` ya resuelven el perfil desde la sesion autenticada; se ignoran identificadores enviados por el navegador.
- Despachos: se agrego `POST /api/inventario/despachar_lote/`, con validacion previa, bloqueo de filas y transaccion unica. El frontend envia un solo lote y evita dejar salidas parciales.
- RBAC: Dashboard oculta alta/procesamiento para operadores y ya no contiene el identificador fijo de usuario.
- Confirmaciones: Dashboard y Planillas usan dialogos accesibles reutilizables en lugar de `confirm()` nativo.
- Recuperacion: Dashboard, Almacen, Configuracion, Planillas y Suscripcion muestran errores recuperables con accion de reintento.
- Configuracion: se integro el panel de accesibilidad y se validan URL/modelo antes de probar o guardar la IA local.
- Navegacion: se agrego vista 404 y se corrigio el acceso movil a Suscripcion para operadores.
- Pruebas: `npm run lint`, `npm run build`, `python manage.py check`, 58 pruebas Django y 54 pruebas Playwright pasan.
- Idempotencia persistente: se agrego `DespachoOperacion` y la migracion `0023_despachooperacion`; `despachar_lote` exige una clave unica, conserva la respuesta y devuelve el resultado anterior cuando el cliente reintenta.
- Atomicidad cubierta: las pruebas `DespachoLoteTests` verifican reintento sin duplicado y rollback cuando una caja del lote no esta disponible.

Pendientes de segunda tanda: observabilidad, OpenAPI/contratos, axe-core, regresión visual, SSE/barcode/PWA y revisión del warning residual de dimensionamiento de Recharts en montaje inicial. Este warning aparece durante la primera medición de `ResponsiveContainer` en Chromium, pero las gráficas se renderizan y las 54 pruebas Playwright pasan.
Actualizacion 12/07/2026: el warning inicial de `ResponsiveContainer` fue eliminado sustituyendo los graficos por dimensiones estables y un contenedor responsive con desplazamiento horizontal controlado. Continuan pendientes observabilidad, OpenAPI/contratos, axe-core, regresion visual, SSE/barcode/PWA.
