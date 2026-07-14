# Informe de auditoria UI/UX y procedimiento de correccion

**Proyecto:** LogiSmart  
**Alcance:** Frontend web React, integracion con API Django, formularios, CRUD, autenticacion, roles y pruebas de uso.  
**Fecha:** 12 de julio de 2026  
**Estado de esta version:** Diagnostico previo a la aplicacion de correcciones.

## 1. Resumen ejecutivo

La integracion de `react-hot-toast`, `AuthContext`, `RequireRole`, rutas protegidas y modales representa una mejora real frente al uso de alertas bloqueantes y formularios embebidos. La compilacion de produccion funciona y el backend dispone de permisos para los catalogos de proveedores, destinos y vehiculos.

Sin embargo, la solucion no puede considerarse cerrada todavia. Las pruebas automatizadas no reproducen el contrato real de autenticacion, dos de tres pruebas Playwright fallan antes de alcanzar el flujo que pretenden verificar y el lint registra ocho errores. Ademas, el CRUD de vehiculos usa la placa donde la API espera el identificador numerico, y la interfaz ofrece eliminar usuarios aunque su endpoint es deliberadamente de solo lectura.

El vehiculo se mantiene dentro del alcance funcional como catalogo de transporte. No se considera equivalente ni dependiente de Arduino, AGV, ESP32 o MQTT.

## 2. Puntuacion inicial

| Dimension | Puntaje | Hallazgo principal |
| --- | ---: | --- |
| Accesibilidad | 2/4 | El modal no declara semantica de dialogo ni gestiona foco, Escape o retorno de foco. |
| Rendimiento | 3/4 | Hay carga diferida por pagina, pero existen peticiones acopladas y estados que pueden quedar bloqueados ante errores. |
| Diseno responsive | 2/4 | La base responde a varios anchos, pero algunos botones de icono no alcanzan 44 x 44 px y las tablas dependen del desplazamiento horizontal. |
| Tematizacion | 2/4 | Hay tokens utiles, pero `index.css` y `design-system.css` redefinen los mismos colores y conviven con colores Tailwind codificados. |
| Antipatrones | 2/4 | Se normalizan componentes mediante selectores globales e `!important`; persisten controles heredados y vocabularios visuales mezclados. |
| **Total** | **11/20** | **Aceptable, requiere correcciones significativas antes de cierre.** |

## 3. Hallazgos prioritarios

### P1. Las pruebas de roles usan un contrato de sesion incorrecto

**Ubicacion:** `logismart-frontend/tests/ui-ux.spec.js`, `src/context/AuthContext.jsx` y endpoint `/api/me/`.

**Evidencia:** El contexto solo acepta una sesion cuando recibe `is_authenticated: true` y calcula privilegios desde `is_superuser`. Los mocks actuales devuelven `rol: 'admin'` u `operador`, campos que el contexto no utiliza. Como resultado, `AdminRoute` muestra acceso denegado y las pruebas no llegan a Nueva Caja ni Administracion.

**Impacto:** Se genera una falsa sensacion de cobertura. Una prueba de permisos puede aprobar porque toda la pagina esta bloqueada, no porque los controles se oculten correctamente.

**Procedimiento de solucion:**

1. Crear objetos de sesion reutilizables con el contrato exacto del backend: `is_authenticated`, `username` e `is_superuser`.
2. Usar una sesion administradora para probar rutas y acciones CRUD.
3. Usar una sesion operadora autenticada para comprobar acceso denegado a rutas administrativas.
4. Separar la prueba de visibilidad de navegacion de la prueba de autorizacion de ruta.
5. Evitar aserciones `soft` para condiciones de seguridad; una falla de RBAC debe fallar la prueba.

### P1. Edicion y eliminacion de vehiculos usan la clave incorrecta

**Ubicacion:** `src/pages/Administracion.jsx` y `src/api/endpoints.js`.

**Evidencia:** `Vehiculo` tiene como clave primaria `id_vehiculo`, pero la interfaz llama `PATCH /vehiculos/{placa}/` y `DELETE /vehiculos/{placa}/`.

**Impacto:** Crear y listar puede funcionar, pero editar y eliminar devuelven 404. Esto contradice el informe de CRUD completo.

**Procedimiento de solucion:**

1. Conservar la placa como dato visible y unico de negocio.
2. Enviar `id_vehiculo` como identificador de ruta para PATCH y DELETE.
3. Mantener la placa editable solo si la regla de negocio lo permite; si cambia, normalizarla a mayusculas antes del envio.
4. Agregar pruebas que capturen la URL y el cuerpo de PATCH y DELETE.
5. Confirmar que la tabla se recarga y conserva el modal abierto cuando el servidor responde con error.

### P1. La interfaz ofrece eliminar usuarios en un recurso de solo lectura

**Ubicacion:** `src/pages/Administracion.jsx`, `src/api/endpoints.js` y `clasificacion/api/catalogo.py`.

**Evidencia:** `UsuarioViewSet` deriva de `ReadOnlyModelViewSet`, pero el frontend presenta una accion de eliminacion y declara funciones POST, PATCH y DELETE.

**Impacto:** El usuario administrador recibe un error 405 en una accion que la UI presenta como valida. Tambien existe riesgo conceptual de borrar el perfil logistico sin resolver su cuenta Django asociada.

**Procedimiento de solucion recomendado:**

1. Tratar usuarios como identidades administradas, no como un catalogo ordinario.
2. Mostrar la tabla de usuarios en modo solo lectura.
3. Retirar acciones y endpoints frontend no soportados.
4. Para una futura gestion de cuentas, crear un flujo dedicado que opere sobre `auth.User`, perfil logistico, grupos, activacion y auditoria dentro de una sola transaccion.
5. Preferir desactivar cuentas frente a borrarlas para preservar trazabilidad de despachos.

### P1. Modal no accesible para teclado ni lector de pantalla

**Ubicacion:** `src/components/ui.jsx`.

**Evidencia:** El modal se implementa con `div`, sin `role="dialog"`, `aria-modal`, titulo asociado, cierre con Escape, foco inicial, contencion de Tab ni retorno de foco.

**Impacto:** Una persona que usa teclado puede interactuar con contenido ubicado detras del modal o perder su posicion al cerrarlo. Incumple los criterios WCAG 2.2 relacionados con foco, teclado y nombre accesible.

**Procedimiento de solucion:**

1. Renderizar el contenedor como `role="dialog"` con `aria-modal="true"` y `aria-labelledby`.
2. Generar un identificador estable para el titulo.
3. Guardar el elemento que tenia foco antes de abrir.
4. Mover el foco al primer control util o al dialogo.
5. Interceptar `Escape` para cerrar.
6. Contener `Tab` y `Shift+Tab` entre los controles del modal.
7. Bloquear el desplazamiento del documento mientras el modal este abierto.
8. Al cerrar, devolver el foco al elemento disparador.
9. Permitir cierre al pulsar el fondo, sin cerrar al pulsar el contenido.

### P1. Los tests de formulario no ejecutan el flujo que describen

**Ubicacion:** `logismart-frontend/tests/ui-ux.spec.js`.

**Evidencia:** La prueba declara una variable `posted` pero nunca la comprueba, no completa todos los campos, no envia el formulario y busca textos de una version anterior.

**Impacto:** No se verifican validaciones en linea, toast, carga, payload ni recuperacion de errores.

**Procedimiento de solucion:**

1. Probar un envio vacio mediante `form.requestSubmit()` para ejecutar la validacion React aun cuando HTML5 impida un clic invalido.
2. Comprobar `aria-invalid`, mensajes asociados y toast de error.
3. Completar todos los controles obligatorios con datos de prueba validos.
4. Interceptar POST `/api/cajas/` y validar el payload campo por campo.
5. Comprobar toast de exito y limpieza del formulario.
6. Agregar un escenario 400 con mensajes del servidor y verificar que el usuario conserve sus datos.

## 4. Hallazgos de severidad media

### P2. Los errores de carga pueden dejar pantallas en estado ambiguo

**Ubicacion:** `Administracion.jsx`, `Despachos.jsx` y `NuevaCaja.jsx`.

`Administracion` usa `Promise.allSettled`, pero convierte silenciosamente cualquier catalogo fallido en una lista vacia. `Despachos` no captura el error de carga y puede quedar sin explicar por que no hay datos. `NuevaCaja` solo escribe algunos errores en consola.

**Solucion:** Mantener el contenido disponible, identificar los recursos fallidos y mostrar un aviso no bloqueante con accion Reintentar. Diferenciar claramente entre `Sin registros` y `No se pudo cargar`.

### P2. Validacion visual sin relaciones ARIA

**Ubicacion:** `NuevaCaja.jsx`.

Los campos cambian a rojo y muestran texto, pero no exponen `aria-invalid` ni `aria-describedby`. El error tampoco se anuncia mediante una region viva.

**Solucion:** Asignar un ID estable a cada mensaje, conectar el campo con `aria-describedby`, aplicar `aria-invalid` y colocar el resumen de error o toast dentro de una region anunciable. Al fallar, enfocar el primer campo invalido.

### P2. Validacion incompleta de valores numericos y texto

**Ubicacion:** `NuevaCaja.jsx`, `Administracion.jsx` y `Despachos.jsx`.

Se comprueba presencia, pero no siempre se normalizan espacios, limites superiores, `NaN`, capacidad positiva, cantidad entera o placa con formato coherente.

**Solucion:** Normalizar texto con `trim`, validar numeros finitos y positivos, declarar `min`, `max` y `step`, y reflejar reglas tanto en frontend como en serializer/modelo.

### P2. Estado de envio incompleto en formularios CRUD

**Ubicacion:** `Administracion.jsx`.

Los botones no se deshabilitan durante POST/PATCH/DELETE. Un doble clic puede repetir operaciones y el dialogo de borrado no muestra progreso.

**Solucion:** Agregar un estado `submitting`, deshabilitar cierre y acciones durante la solicitud, cambiar el texto a `Guardando...` o `Eliminando...` y evitar solicitudes duplicadas.

### P2. Duplicacion y competencia entre sistemas de tema

**Ubicacion:** `src/index.css` y `src/design-system.css`.

Ambos archivos definen `:root` y `.dark` para los mismos tokens con valores diferentes. El resultado depende del orden de importacion. Ademas, existen numerosos colores directos y adaptadores globales con `!important`.

**Solucion:** Mantener una unica fuente de tokens en `design-system.css`; limitar `index.css` a Tailwind, reset y utilidades globales. Migrar gradualmente clases heredadas a componentes semanticos y eliminar overrides globales cuando ya no sean necesarios.

### P2. Objetivos tactiles inferiores a 44 px

**Ubicacion:** botones de acciones de tabla, cierre de modal y varios icon buttons.

**Impacto:** Dificulta el uso en tabletas y dispositivos tactiles, un entorno esperado para LogiSmart.

**Solucion:** Definir un control compacto visual de 32-36 px dentro de un area interactiva minima de 44 x 44 px; separar acciones al menos 4 px y mantener foco visible.

### P2. La busqueda de la barra superior no ejecuta una accion

**Ubicacion:** `src/components/Navbar.jsx`.

El control sugiere que permite buscar cajas, pero no actualiza ninguna vista ni navega a resultados.

**Solucion:** Conectar la busqueda a `/stock?search=...`, ejecutarla con Enter, conservar el termino en la URL y ofrecer una etiqueta accesible visible o contextual. Si no se implementa, retirar temporalmente el control para no crear una promesa falsa.

## 5. Mejoras de calidad y pulido

### P3. Iconografia inconsistente

Las pantallas nuevas mezclan `lucide-react` con clases Bootstrap Icons. Se recomienda usar Lucide para nuevas acciones y conservar Bootstrap solo durante una migracion controlada.

### P3. Copia de acciones generica

Mensajes como `Error al eliminar registro` no indican entidad, causa ni siguiente paso. Las respuestas del API deben transformarse en mensajes concretos, por ejemplo: `No se puede eliminar este destino porque tiene despachos asociados`.

### P3. Tablas administrativas sin nombres de fila estables

Las filas usan el indice como `key`. Deben usar `id_usuario`, `id_proveedor`, `id_destino` o `id_vehiculo` para evitar reutilizacion visual incorrecta tras editar o eliminar.

### P3. Jerarquia de administracion mejorable

Cuatro paneles simultaneos funcionan con pocos datos, pero escalan mal. Para mas registros conviene usar pestanas por entidad, contador de resultados, busqueda local y paginacion. No es necesario introducirlo ahora si el volumen sigue siendo bajo.

## 6. Patrones sistemicos

- El frontend y los tests no comparten factories del contrato API; por eso los mocks se desviaron del backend.
- Los estados `vacio`, `error` y `cargando` se representan de forma inconsistente.
- Los formularios mezclan HTML5, validacion React y validacion del servidor sin un modelo comun de errores.
- El sistema visual actual combina tokens modernos con clases heredadas y adaptadores globales.
- La autorizacion del servidor es correcta como ultima barrera, pero la presentacion del frontend debe derivarse del mismo contrato de sesion.

## 7. Aspectos positivos que deben conservarse

- La API restringe las escrituras de catalogos a administradores.
- El frontend usa carga diferida por pagina.
- Los toasts eliminan bloqueos producidos por `alert()`.
- La interfaz ya dispone de foco visible y preferencia de movimiento reducido.
- Las acciones administrativas estan ocultas segun el contexto y las rutas sensibles tienen una segunda barrera visual.
- El sistema de tokens en OKLCH de `design-system.css` ofrece una buena base para contraste y modos claro/oscuro.
- Vehiculos se encuentra separado del antiguo alcance Arduino/AGV y sirve como catalogo logistico de transporte.

## 8. Plan de implementacion

### Etapa 1: Restablecer consistencia funcional

1. Corregir IDs de vehiculos en PATCH y DELETE.
2. Retirar operaciones de usuario no soportadas y presentar esa seccion como solo lectura.
3. Unificar el contrato de sesion consumido por contexto, rutas, navbar y tests.
4. Incorporar estados de error y carga recuperables.

### Etapa 2: Endurecer formularios y modal

1. Implementar semantica, foco, Escape y bloqueo de scroll en Modal.
2. Agregar estados de envio y prevenir doble operacion.
3. Asociar errores de Nueva Caja con sus campos y enfocar el primer error.
4. Mostrar mensajes de API utiles sin perder datos ingresados.

### Etapa 3: Corregir la suite de pruebas

1. Sustituir mocks obsoletos.
2. Probar acceso admin y denegacion operador.
3. Probar creacion, edicion y eliminacion real de cada catalogo editable.
4. Probar validacion y envio de Nueva Caja.
5. Probar teclado y cierre del modal.
6. Ejecutar las pruebas en escritorio y viewport de tableta.

### Etapa 4: Consolidar calidad visual

1. Corregir errores ESLint.
2. Evitar colores directos en componentes nuevos.
3. Aplicar objetivos tactiles minimos.
4. Mejorar copias de error y estados vacios.
5. Mantener una unica fuente de verdad para tokens en una refactorizacion gradual, evitando una sustitucion masiva riesgosa.

## 9. Criterios de aceptacion

- `npm run lint` finaliza sin errores.
- `npm run build` finaliza sin errores.
- Playwright valida formularios, CRUD, roles y teclado sin pruebas omitidas ni aserciones blandas de seguridad.
- PATCH y DELETE de vehiculos usan `id_vehiculo`.
- La UI no ofrece operaciones de usuario rechazadas por el backend.
- El modal conserva y restaura foco, cierra con Escape y evita navegacion al fondo.
- Los errores de formulario tienen texto, estado ARIA y foco util.
- Los botones de acciones criticas evitan doble envio y expresan progreso.
- La aplicacion conserva vehiculos sin reintroducir dependencias Arduino, AGV, ESP32 o MQTT.

## 10. Resultado esperado posterior

Tras aplicar el plan y repetir la auditoria, el objetivo razonable es alcanzar al menos **17/20**: accesibilidad 4/4, rendimiento 3/4, responsive 3/4, tematizacion 3/4 y antipatrones 4/4 en las superficies intervenidas.

## 11. Resultado de la implementacion

El plan prioritario fue aplicado despues de documentar los hallazgos.

### Cambios realizados

1. Se corrigio el modo de desarrollo de Vite para que Playwright cargue la SPA desde la raiz y el prefijo `/static/frontend/` se conserve solo para produccion.
2. Se alineo el contrato de sesion entre backend y frontend incorporando `is_staff` y calculando el permiso visual de administrador con `is_superuser || is_staff`.
3. Se corrigio el CRUD de vehiculos para que PATCH y DELETE utilicen `id_vehiculo`, manteniendo la placa como dato visible.
4. Se dejo la tabla de usuarios en solo lectura, coherente con `UsuarioViewSet` y con la necesidad de preservar trazabilidad de cuentas.
5. Se agregaron estados de error recuperables en Administracion y Despachos.
6. Se agregaron estados de envio para evitar operaciones repetidas en los modales.
7. El modal ahora implementa dialogo accesible, foco inicial, foco contenido, cierre con Escape, cierre por fondo, bloqueo de scroll y restauracion del foco.
8. Nueva Caja usa validacion propia con `noValidate`, enfoca el primer error y expone `aria-invalid` y `aria-describedby` en los campos principales.
9. La busqueda global navega a Stock con el termino en la URL.
10. Se corrigieron los errores de lint y se reescribieron las pruebas para ejecutar los flujos reales.

### Verificacion posterior

| Verificacion | Resultado |
| --- | --- |
| `npm run lint` | Correcto, sin errores |
| `npm run build` | Correcto |
| Playwright UI/UX | 4 pruebas correctas |
| Pruebas Django | 58 pruebas correctas |
| `manage.py check` | Sin problemas |
| `makemigrations --check --dry-run` | Sin cambios pendientes |
| Escaneo de codigo activo AGV/Arduino/ESP32/MQTT | Sin referencias activas |

Las menciones que permanecen en migraciones historicas (`0002`, `0007`, `0019`) se conservan para que el historial de esquema pueda reproducirse. No representan modelos, endpoints ni procesos activos. El catalogo de vehiculos permanece habilitado como transporte logistico independiente de Arduino y AGV.
