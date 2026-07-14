# Informe de 50 pruebas funcionales y oportunidades UI/UX

**Proyecto:** LogiSmart  
**Fecha:** 12 de julio de 2026  
**Alcance:** Aplicacion web React, navegacion, autenticacion, permisos, inventario, almacen, cajas, despachos, administracion, configuracion, planillas, PDF y suscripcion.  
**Suite:** `logismart-frontend/tests/functional-50.spec.js`

## 1. Resultado ejecutivo

Se implementaron y ejecutaron exactamente 50 pruebas funcionales nuevas con Playwright. La ejecucion final obtuvo **50 pruebas correctas de 50** en Chromium, usando cuatro workers y datos controlados por mocks de API.

El resultado verde confirma que los recorridos observados se comportan de forma consistente bajo los contratos simulados. No significa que la experiencia este libre de riesgos. Durante la ejecucion se identificaron problemas de accesibilidad, tolerancia a fallos, atribucion de usuario, permisos visuales, operaciones parciales y observabilidad que deben entrar al plan de mejora.

### Distribucion

| Area | Casos | Resultado |
| --- | ---: | ---: |
| Sesion, roles y navegacion | 8 | 8/8 |
| Dashboard | 8 | 8/8 |
| Mapa de almacen | 5 | 5/5 |
| Stock e inventario | 10 | 10/10 |
| Registro de cajas | 5 | 5/5 |
| Despachos | 5 | 5/5 |
| Administracion y configuracion | 6 | 6/6 |
| Planillas, PDF y suscripcion | 3 | 3/3 |
| **Total** | **50** | **50/50** |

## 2. Metodologia

1. Se inventariaron las rutas declaradas en `App.jsx` y los endpoints consumidos por cada pagina.
2. Se creo un contrato de datos comun para cajas, ubicaciones, categorias, proveedores, medidas, usuarios, vehiculos, destinos, stock, movimientos, alertas y planillas.
3. Cada prueba se ejecuta en una pagina aislada y con una sesion explicita de administrador u operador.
4. Se registran solicitudes para comprobar metodo, ruta e identificadores enviados al backend.
5. Se simulan estados con datos, estados vacios y respuestas HTTP 500.
6. Se incluyen interacciones de teclado, viewport movil, persistencia en `localStorage`, dialogos, formularios y permisos.
7. Se corrigieron selectores de prueba que no representaban el DOM real antes de clasificar defectos del producto.

## 3. Catalogo de pruebas

| ID | Vista | Comprobacion | Resultado |
| --- | --- | --- | --- |
| T01 | Login | Campos y accion principal visibles | Correcto |
| T02 | Login | Mostrar y ocultar contrasena | Correcto |
| T03 | Login | Mensaje ante credenciales incorrectas | Correcto |
| T04 | Login | Persistencia del tema | Correcto |
| T05 | Navegacion | Accesos administrativos para administrador | Correcto |
| T06 | Navegacion | Ocultamiento administrativo para operador | Correcto |
| T07 | Rutas | Acceso denegado a operador | Correcto |
| T08 | Busqueda | Navegacion a Stock con termino en URL | Correcto |
| T09 | Dashboard | Titulo y contexto operativo | Correcto |
| T10 | Dashboard | Exclusion de cajas despachadas del total activo | Correcto |
| T11 | Dashboard | Conteo de pendientes | Correcto |
| T12 | Dashboard | Calculo de ocupacion fisica | Correcto |
| T13 | Dashboard | Filtro por estado | Correcto |
| T14 | Dashboard | Filtro por categoria sin coincidencias | Correcto, con hallazgo UX |
| T15 | Dashboard | Procesamiento confirmado de caja | Correcto, con hallazgo UX |
| T16 | Navbar | Conteo de pendientes | Correcto |
| T17 | Almacen | Titulo del mapa | Correcto |
| T18 | Almacen | Total de ubicaciones | Correcto |
| T19 | Almacen | Total de ubicaciones ocupadas | Correcto |
| T20 | Almacen | Diferenciacion libre/ocupada | Correcto |
| T21 | Almacen | Ausencia de desborde movil a 390 px | Correcto |
| T22 | Stock | Resumen de existencias | Correcto |
| T23 | Stock | Detalle y ubicacion | Correcto |
| T24 | Stock | Estado vacio | Correcto |
| T25 | Stock | Busqueda precargada desde URL | Correcto |
| T26 | Stock | Aplicacion de filtros al endpoint | Correcto |
| T27 | Stock | Reserva de existencias | Correcto |
| T28 | Stock | Politica de stock | Correcto |
| T29 | Stock | Alertas activas | Correcto |
| T30 | Stock | Kardex reciente | Correcto |
| T31 | Stock | Error recuperable de API | Correcto |
| T32 | Nueva Caja | ID sugerido | Correcto |
| T33 | Nueva Caja | Validacion accesible | Correcto |
| T34 | Nueva Caja | Calculo de peso unitario | Correcto |
| T35 | Nueva Caja | Creacion con proveedor y medida | Correcto |
| T36 | Nueva Caja | Bloqueo de previsualizacion sin operador | Correcto |
| T37 | Despachos | Carga almacenada disponible | Correcto |
| T38 | Despachos | Seleccion total y contador | Correcto |
| T39 | Despachos | Boton deshabilitado sin transporte | Correcto |
| T40 | Despachos | Registro con vehiculo y destino | Correcto |
| T41 | Despachos | Estado sin salidas previas | Correcto |
| T42 | Administracion | Cuatro catalogos visibles | Correcto |
| T43 | Administracion | Usuarios de solo lectura | Correcto |
| T44 | Administracion | Vehiculo editado por ID interno | Correcto |
| T45 | Administracion | Cierre del modal con Escape | Correcto |
| T46 | Configuracion | Medidas registradas | Correcto |
| T47 | Configuracion | Persistencia de IA local | Correcto |
| T48 | Planillas | Filtros pendientes/completadas | Correcto |
| T49 | PDF | Conservacion de cajas y usuario en URL | Correcto |
| T50 | Suscripcion | Estado y envio de cotizacion | Correcto |

## 4. Hallazgos recolectados

### P1. Dashboard ofrece acciones administrativas a operadores

**Ubicacion:** `logismart-frontend/src/pages/Dashboard.jsx`.

El Navbar oculta `Nueva caja` para operadores, pero Dashboard presenta enlaces `Nueva caja` y `Agregar` sin consultar el rol. Al pulsarlos, el operador termina en una ruta con `Acceso Denegado`.

**Impacto:** El usuario recibe una promesa de accion que luego se rechaza. Esto aumenta frustracion y hace que RBAC parezca inconsistente.

**Procedimiento recomendado:**

1. Consumir `useAuth()` dentro de Dashboard.
2. Mostrar enlaces de alta solo cuando `isAdmin` sea verdadero.
3. Para operadores, reemplazar el espacio por informacion operativa util, no por un control deshabilitado.
4. Agregar una prueba de rol especificamente sobre las acciones internas de Dashboard.

### P1. Acciones de caja atribuidas al usuario fijo 1

**Ubicacion:** `Dashboard.jsx`, llamadas a `procesarCaja` y `confirmarAlmacenada`.

El payload usa `id_usuario: 1`. La operacion puede quedar asociada a una persona diferente de quien inicio sesion.

**Impacto:** Rompe trazabilidad y auditoria, especialmente si el backend conserva compatibilidad con el ID enviado por el cliente.

**Procedimiento recomendado:**

1. Eliminar el identificador fijo del frontend.
2. Resolver al responsable exclusivamente desde `request.user` y su perfil logistico en el backend.
3. Rechazar payloads que intenten suplantar otro usuario.
4. Registrar actor, fecha, caja, estado anterior y estado nuevo en un evento de auditoria.

### P1. Filtros del Dashboard no son operables por teclado

**Ubicacion:** `Dashboard.jsx`, filtros construidos con elementos `span` y `onClick`.

Los filtros se comportan como botones pero no tienen semantica, foco, Enter, Espacio ni estado accesible.

**Impacto:** Usuarios de teclado y tecnologias de asistencia no pueden filtrar cajas. Incumple WCAG 2.1.1 y 4.1.2.

**Procedimiento recomendado:**

1. Sustituir cada `span` interactivo por `button type="button"`.
2. Agrupar filtros de estado y categoria con nombre accesible.
3. Exponer seleccion mediante `aria-pressed` o un tablist correcto.
4. Mantener un objetivo tactil minimo de 44 x 44 px.
5. Probar Tab, Enter, Espacio y foco visible.

### P1. Despacho multiple no es atomico

**Ubicacion:** `logismart-frontend/src/pages/Despachos.jsx`.

La interfaz envia una solicitud por caja dentro de un bucle. Si una solicitud intermedia falla, algunas cajas quedan despachadas y otras no.

**Impacto:** Puede producir una salida fisica parcialmente registrada, dificil de reconciliar y repetir.

**Procedimiento recomendado:**

1. Crear un endpoint de lote con cajas, cantidades, vehiculo y destino.
2. Validar disponibilidad completa antes de modificar existencias.
3. Ejecutar el lote dentro de `transaction.atomic()`.
4. Devolver resultado unico y un identificador de despacho/lote.
5. Si el negocio permite parciales, mostrar un resumen por caja y una accion de reintento idempotente.

### P1. Vistas sin recuperacion uniforme ante fallo de API

**Ubicacion:** `Dashboard.jsx`, `AlmacenVisual.jsx`, `Configuracion.jsx`, `Planillas.jsx` y `Suscripcion.jsx`.

Stock y Despachos ya presentan errores recuperables, pero otras vistas registran en consola, quedan vacias, mantienen un spinner o producen una promesa rechazada sin accion visible.

**Impacto:** El usuario no puede distinguir entre ausencia de datos, sesion vencida, red caida o error del servidor.

**Procedimiento recomendado:**

1. Definir un componente comun `AsyncState` con loading, empty, error y retry.
2. Capturar errores en cada carga inicial.
3. Conservar datos anteriores durante una recarga fallida.
4. Mostrar mensaje orientado a accion y codigo de correlacion cuando exista.
5. Agregar pruebas HTTP 401, 403, 404, 409, 422, 500 y timeout.

### P1. Confirmaciones nativas bloqueantes permanecen activas

**Ubicacion:** `Dashboard.jsx` y `Planillas.jsx`.

Se utiliza `window.confirm()` para procesar cajas, confirmar almacenamiento y completar planillas.

**Impacto:** Bloquea el hilo de interfaz, no respeta el sistema visual, limita accesibilidad y complica automatizacion.

**Procedimiento recomendado:**

1. Reutilizar el modal accesible existente.
2. Describir entidad, consecuencia y accion exacta.
3. Usar una accion primaria acorde al riesgo y cancelar como foco inicial cuando sea destructiva.
4. Mostrar progreso y evitar doble envio.
5. Reemplazar los tests de dialogo nativo por pruebas del modal.

### P2. Tabla filtrada sin estado vacio

**Ubicacion:** `Dashboard.jsx`.

T14 confirma que el filtro funciona, pero cuando no hay coincidencias el `tbody` queda vacio sin explicacion.

**Mejora:** Mostrar `No hay cajas para estos filtros`, indicar filtros activos y ofrecer `Limpiar filtros`.

### P2. Recharts advierte dimensiones negativas durante montaje

**Evidencia:** La ejecucion emitio repetidamente `The width(-1) and height(-1) of chart should be greater than 0`.

**Impacto:** En pestañas ocultas, cargas lentas o contenedores aun no medidos, el grafico puede parpadear o aparecer vacio.

**Procedimiento recomendado:**

1. Dar `min-width: 0` y altura estable al contenedor.
2. No montar `ResponsiveContainer` hasta que el contenedor sea medible.
3. Usar `minWidth`/`minHeight` o una relacion de aspecto estable.
4. Agregar prueba de pixeles o screenshot para detectar grafico en blanco.

### P2. Preferencias de accesibilidad no estan conectadas a Configuracion

**Ubicacion:** existe `AccessibilitySettings.jsx`, pero `Configuracion.jsx` no lo renderiza.

**Impacto:** Hay soporte tecnico para alto contraste, daltonismo y reduccion de movimiento, pero el usuario no encuentra los controles.

**Mejora:** Integrar el componente en Configuracion, probar persistencia y confirmar las clases aplicadas a `documentElement`.

### P2. Navegacion movil oculta Suscripcion a operadores

**Ubicacion:** `Navbar.jsx`.

En escritorio Suscripcion se muestra para cualquier usuario. En movil esta dentro del bloque administrativo, por lo que un operador no dispone del mismo acceso.

**Mejora:** Mover Suscripcion fuera del fragmento `isAdmin` y probar paridad de enlaces entre escritorio y movil.

### P2. No existe ruta de pagina no encontrada

**Ubicacion:** `App.jsx`.

Una URL desconocida no tiene un `Route path="*"`. El contenido principal puede quedar vacio.

**Mejora:** Crear un estado 404 con retorno al Dashboard, busqueda y conservacion del Navbar para sesiones validas.

### P2. Configuracion de IA local acepta valores sin validar

**Ubicacion:** `LocalAiSettings.jsx`.

Endpoint y modelo se guardan directamente. No se valida protocolo, host local, formato ni modelo vacio.

**Mejora:** Validar URL con `URL`, permitir explicitamente hosts locales/autorizados, mostrar errores por campo y separar Guardar de Probar conexion.

## 5. Posibles integraciones

### Prioridad alta

#### Sentry u OpenTelemetry para errores frontend

**Objetivo:** Capturar excepciones, promesas rechazadas, ruta, version y usuario anonimizado.

**Procedimiento:**

1. Instalar SDK solo para produccion y staging.
2. Configurar `ErrorBoundary` alrededor de rutas lazy.
3. Enviar `release` igual al commit desplegado.
4. Filtrar credenciales, payloads y datos personales.
5. Asociar errores backend mediante un `correlation_id` compartido.

#### Cliente generado desde OpenAPI

**Objetivo:** Evitar discrepancias como IDs, campos de sesion o endpoints no soportados.

**Procedimiento:**

1. Usar el schema de DRF Spectacular existente.
2. Generar tipos y cliente con Orval u OpenAPI Generator.
3. Sustituir gradualmente `endpoints.js` por funciones tipadas.
4. Validar el schema en CI y fallar cuando haya cambios incompatibles.

#### axe-core en Playwright

**Objetivo:** Detectar automaticamente nombres accesibles, contraste, landmarks y relaciones ARIA.

**Procedimiento:**

1. Instalar `@axe-core/playwright`.
2. Ejecutar escaneo por cada vista estable.
3. Mantener excepciones documentadas y temporales.
4. Fallar CI ante violaciones critical/serious.

### Prioridad media

#### MSW para contratos de pruebas

Centraliza mocks de API y permite reutilizarlos en Playwright, pruebas de componentes y desarrollo aislado. Evita que cada archivo reproduzca manualmente el contrato.

#### Regresion visual

Agregar screenshots de Dashboard, Stock, Despachos, Administracion, Login y movil. Comparar temas claro/oscuro y preferencias de alto contraste.

#### Actualizacion operativa mediante SSE

Para pendientes, ubicaciones y stock puede utilizarse Server-Sent Events. Es mas simple que WebSocket cuando el flujo principal es servidor hacia navegador y no implica el antiguo AGV.

#### Escaneo de codigos

Integrar lectores tipo keyboard-wedge y camara con `BarcodeDetector` como mejora progresiva. El formulario debe seguir funcionando manualmente cuando el dispositivo no lo soporte.

#### PWA operativa con cola idempotente

Puede mejorar el trabajo en tabletas con conectividad inestable. Solo debe implementarse si el backend acepta claves de idempotencia y ofrece reconciliacion visible; almacenar operaciones sensibles sin ese contrato seria riesgoso.

## 6. Reglas de negocio confirmadas por la bateria

- Solo administradores acceden a Nueva Caja, Administracion y Configuracion.
- Usuarios logisticos se muestran en modo de solo lectura.
- Vehiculos forman parte del transporte logistico y se actualizan por `id_vehiculo`.
- Solo cajas almacenadas pueden seleccionarse para despacho.
- Un despacho requiere carga, vehiculo y destino.
- Cajas despachadas no cuentan como activas en Dashboard.
- La reserva de stock no se presenta para referencias sin disponibilidad.
- La previsualizacion de cola exige un operador responsable.
- Filtros de Stock se reflejan en la consulta del backend.
- El visor PDF conserva cajas y usuario en su URL operativa.

## 7. Proximo plan recomendado

1. **P1 - `$impeccable harden`:** eliminar IDs fijos, unificar errores y crear despacho atomico.
2. **P1 - `$impeccable clarify`:** sustituir confirmaciones nativas y mejorar mensajes vacios/error.
3. **P1 - `$impeccable adapt`:** corregir filtros de teclado y paridad movil del Navbar.
4. **P2 - `$impeccable optimize`:** estabilizar dimensiones de Recharts y medir bundles/renders.
5. **P2 - `$impeccable polish`:** integrar accesibilidad, 404 y regresion visual final.

Repetir esta suite y la auditoria tecnica despues de las correcciones permite medir la mejora sin perder las reglas ya confirmadas.
