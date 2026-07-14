# Informe técnico del algoritmo de ubicación Slotting v2

**Proyecto:** LogiSmart  
**Fecha de evaluación:** 12 de julio de 2026  
**Alcance:** características físicas del almacén, calidad de datos, recomendación individual, optimización de lotes, concurrencia, trazabilidad y experiencia operativa.

## 1. Resultado ejecutivo

El algoritmo anterior era útil como demostración, pero no era seguro para una operación real. Comparaba el peso unitario en vez del peso total, no comprobaba dimensiones, recomendaba cada caja de forma aislada y aceptaba asignaciones manuales incompatibles. También utilizaba una puntuación aditiva sin escala estable y no modelaba cadena de frío, distancia ni disponibilidad técnica del casillero.

La versión 2 corrige esas limitaciones. El sistema ahora:

- valida primero la factibilidad física y de seguridad;
- calcula el peso total como `peso_kg × cantidad`;
- comprueba el encaje tridimensional, permitiendo únicamente giro horizontal de 90°;
- separa químicos y productos refrigerados de forma exclusiva;
- considera ergonomía, distancia, prioridad, vencimiento y consolidación;
- resuelve todas las cajas de un lote mediante emparejamiento bipartito de peso máximo;
- impide que dos cajas reciban el mismo casillero;
- valida los cambios manuales con las mismas reglas del motor;
- procesa el lote dentro de una transacción y con bloqueo de filas;
- explica cada recomendación mediante score, componentes, métricas y motivos.

El resultado es **viable para el alcance actual del proyecto** y considerablemente más cercano a un sistema WMS real. No reemplaza todavía un estudio estructural certificado de racks ni sensores de temperatura; esos límites se detallan al final.

## 2. Auditoría de los datos reales

### 2.1 Estado inicial

- Espacios registrados: **72**.
- Espacios en uso: **23**.
- Ocupación: **31,9 %**.
- Cajas activas con ubicación: **23**.
- Distribución: 12 frágiles, 12 pesados, 12 refrigerados, 12 químicos y 24 generales.
- Desajustes entre cajas y bandera de ocupación: **0**.
- Asignaciones incompatibles detectadas: **2**.

Hallazgos iniciales:

| Caja | Ubicación inicial | Hallazgo |
|---|---|---|
| `CAJ-TEST-PDF` | A1 nivel 1 | Peso total de 155 kg en un casillero frágil de 45 kg. |
| `CAJ-20260712-002` | B1 nivel 2 | Producto electrónico dentro de una zona exclusiva para químicos. |

### 2.2 Corrección aplicada

La corrección se ejecutó con `python manage.py audit_warehouse_slotting --apply` dentro de una transacción.

| Caja | Nueva ubicación | Justificación |
|---|---|---|
| `CAJ-TEST-PDF` | A2 nivel 2 | Rack reforzado; capacidad suficiente para 155 kg. |
| `CAJ-20260712-002` | A1 nivel 3 | Zona electrónica/frágil, peso y dimensiones compatibles. |

Resultado posterior:

- Asignaciones incompatibles o duplicadas: **0**.
- Desajustes de ocupación: **0**.
- Ocupación conservada: **23 de 72 (31,9 %)**.
- No se eliminaron cajas, credenciales, claves ni datos locales.

## 3. Caracterización realista del almacén

Se añadieron a cada ubicación `ancho_util_cm`, `fondo_util_cm`, `alto_util_cm`, `distancia_salida_m` y `activo`. La capacidad varía por nivel para reflejar límites de carga y manipulación.

| Rack | Uso principal | Dimensiones útiles por nivel (ancho × fondo × alto) | Capacidad por nivel 1 / 2 / 3 | Distancia | Protección especial |
|---|---|---|---|---|---|
| A1 | Electrónica y frágil | 55 × 60 × 55/50/45 cm | 45 / 35 / 25 kg | 4,0–5,1 m | 12 espacios frágiles |
| A2 | Carga pesada y herramientas | 90 × 100 × 75/70/60 cm | 250 / 180 / 100 kg | 7,0–8,1 m | 2 huecos bajos frontales para carga pesada frágil |
| A3 | Cadena de frío y alimentos | 60 × 65 × 55/50/45 cm | 60 / 45 / 30 kg | 10,0–11,1 m | 12 espacios refrigerados y frágiles |
| B1 | Químicos aislados | 60 × 60 × 60/55/50 cm | 100 / 75 / 50 kg | 8,0–9,1 m | Contención química y sujeción para envases frágiles |
| B2 | Textil y carga general | 90 × 85 × 70/65/55 cm | 90 / 65 / 45 kg | 11,0–12,1 m | Admite frágil |
| B3 | Carga general y baja rotación | 80 × 80 × 65/60/50 cm | 80 / 60 / 40 kg | 14,0–15,1 m | Admite frágil |

La distancia incorpora un incremento de 0,8 m para el lado posterior y 0,3 m para el segundo casillero. Esto permite diferenciar ubicaciones que antes tenían las mismas coordenadas lógicas.

## 4. Reglas de negocio formalizadas

### 4.1 Interpretación de una caja

- Un registro `Caja` representa un embalaje físico.
- `peso_kg` es el peso por unidad del contenido.
- `cantidad` es el número de unidades dentro del embalaje.
- El peso estructural utilizado es `peso_kg × cantidad`.
- La medida corresponde a las dimensiones exteriores del embalaje completo y no se multiplica por cantidad.
- Una caja nueva siempre entra como `pendiente` y sin ubicación.

### 4.2 Restricciones duras

Una ubicación se descarta antes de puntuar si incumple cualquiera de estas condiciones:

1. Está ocupada o fuera de servicio.
2. El peso total supera su capacidad.
3. La caja no cabe en orientación original ni girada horizontalmente 90°.
4. Una caja frágil se dirige a un espacio sin protección.
5. Un químico intenta entrar fuera de B1 o un producto común intenta entrar en B1.
6. Un producto con cadena de frío intenta entrar fuera de A3.
7. Un producto de ambiente intenta consumir capacidad refrigerada.
8. El casillero ya fue reservado por otra caja del mismo lote.

Estas reglas no pueden ser compensadas por un score alto. La seguridad siempre antecede a la optimización.

### 4.3 Integridad de datos

Se añadieron restricciones en base de datos y validaciones API para impedir:

- peso igual o menor que cero;
- cantidad negativa o cero, salvo cero cuando el estado final es `despachada`;
- dimensiones o volumen no positivos;
- capacidad de casillero no positiva;
- distancia negativa;
- niveles y estantes menores que uno.

La API REST y la API externa v1 devuelven errores de validación antes de llegar a una violación de base de datos. La API v1 exige peso positivo y fuerza el estado inicial `pendiente`, aunque el integrador intente enviar `EN_ALMACEN`.

## 5. Función de puntuación explicable

Solo las ubicaciones factibles reciben una puntuación. El resultado se normaliza entre 0 y 100.

| Componente | Máximo | Objetivo |
|---|---:|---|
| Zona y seguridad | 30 | Afinidad con química, frío, fragilidad, carga pesada o categoría. |
| Ergonomía | 20 | Pesados cerca del suelo, frágiles en altura controlada y ligeros en niveles superiores. |
| Ajuste de capacidad | 20 | Evitar tanto el desperdicio extremo como una ocupación al límite. |
| Accesibilidad | 15 | Menor distancia para urgente/alta prioridad y vencimiento próximo. |
| Consolidación | 10 | Agrupar familias de producto dentro del mismo rack. |
| Preservación de recursos | 10 | No consumir refrigeración, contención, protección o rack reforzado sin necesidad. |

Métricas devueltas por recomendación:

- peso total;
- porcentaje de utilización de peso;
- volumen de la caja;
- porcentaje de utilización volumétrica;
- distancia a salida;
- orientación física elegida;
- versión del algoritmo;
- desglose de componentes y motivos legibles.

## 6. Optimización global del lote

El problema se representa como un grafo bipartito:

- un conjunto de nodos son las cajas pendientes;
- el otro conjunto son las ubicaciones libres;
- una arista existe únicamente si la pareja es compatible;
- el peso de la arista deriva del score y del desempate determinista.

Se usa `networkx.max_weight_matching` con `maxcardinality=True`. El orden de objetivos es:

1. maximizar el número total de cajas asignadas;
2. maximizar la suma de puntuaciones del lote;
3. desempatar por orden de candidato, distancia y coordenadas estables.

Esto evita el defecto de una estrategia codiciosa: una caja flexible no consume el único espacio válido para una caja frágil, química o refrigerada.

Benchmark local reproducible:

- lote evaluado: 100 cajas;
- tiempo observado: aproximadamente **0,27 s**;
- límite API: 100 cajas;
- límite operativo predeterminado: 20 cajas.

El benchmark mide el entorno local actual; no constituye un SLA de producción.

## 7. Transacciones y concurrencia

El procesamiento de lote ahora:

1. bloquea las cajas pendientes con `select_for_update`;
2. bloquea el inventario de ubicaciones activas;
3. valida que una ubicación manual no esté duplicada;
4. valida peso, dimensiones y especialización de cada cambio manual;
5. reserva los espacios manuales;
6. optimiza globalmente el resto del lote;
7. actualiza cajas, ocupación, historial y planilla en la misma transacción.

Si una asignación manual es inválida, el lote completo se rechaza antes de modificar datos. Las cajas sin alternativa automática permanecen pendientes y se reportan en `sin_ubicacion`.

El flujo individual también bloquea filas y solo acepta cajas en estado `pendiente` o `clasificada`. Reprocesar una caja `en_transito` o `almacenada` devuelve error y conserva su ubicación actual.

## 8. Experiencia de usuario

- El formulario permite indicar cadena de frío mediante un switch accesible.
- La cola muestra peso total, no solamente peso unitario.
- La previsualización utiliza la solución global y no repite casilleros.
- Los espacios incompatibles aparecen deshabilitados en la selección manual.
- La recomendación muestra score, peso total, utilización, distancia y motivos.
- El mapa muestra dimensiones útiles, distancia, tipo, compatibilidad y estado de servicio.
- Los casilleros fuera de servicio se diferencian de los incompatibles y ocupados.
- La selección conserva el pasillo relevante al cambiar de caja.

## 9. Datos de prueba

El comando `seed_demo_warehouse` se actualizó con nueve perfiles realistas y dimensiones distintas:

- electrónica frágil;
- herramientas pesadas;
- textiles;
- alimentos de ambiente;
- sensores urgentes;
- repuestos mecánicos;
- embalaje voluminoso;
- alimentos refrigerados;
- reactivos químicos frágiles.

El almacén local ya superaba el objetivo del 30 %, por lo que no se duplicaron datos: se conservaron las 23 ocupaciones existentes y se corrigieron únicamente las dos incompatibles.

## 10. Verificación ejecutada

- `python manage.py check`: sin hallazgos.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test clasificacion`: **90/90 pruebas aprobadas**.
- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- `npx playwright test`: **61/61 pruebas aprobadas**.
- `python manage.py audit_warehouse_slotting`: 0 incompatibilidades y 0 desajustes.

La cobertura incluye peso total, encaje, rotación, sobrepeso, frío, química, fragilidad, carga pesada, niveles, prioridad, distancia, score, matching global, duplicados, override manual, rollback, transiciones, API externa, inventario, auditoría y controles de interfaz.

## 11. Procedimiento operativo

### Auditar sin modificar

```powershell
python manage.py audit_warehouse_slotting
```

### Corregir asignaciones incompatibles

```powershell
python manage.py audit_warehouse_slotting --apply
```

La aplicación es atómica: si alguna caja no tiene alternativa segura, se revierte la reubicación completa.

### Cambiar capacidades o dimensiones

1. Obtener la ficha técnica del rack y confirmar si la carga indicada es por casillero, nivel o módulo.
2. Medir el hueco útil, no la dimensión exterior del rack.
3. Actualizar ancho, fondo, alto, capacidad, distancia y estado activo.
4. Ejecutar la auditoría sin `--apply`.
5. Revisar todos los hallazgos con el responsable de almacén.
6. Ejecutar `--apply` solo después de aprobar las alternativas.
7. Volver a ejecutar la auditoría y la suite de pruebas.

### Incorporar una nueva regla

1. Definir si es una restricción de seguridad o una preferencia.
2. Las restricciones se implementan en `_es_compatible`.
3. Las preferencias se agregan como componente de score acotado.
4. Añadir al menos un caso válido, uno inválido y uno de conflicto de lote.
5. Exponer el motivo en la respuesta para mantener explicabilidad.
6. Ejecutar las suites backend y frontend completas.

## 12. Límites y siguiente evolución

1. **Capacidad estructural agregada:** actualmente se controla por casillero. Para racks certificados debe modelarse también el límite por viga, nivel y módulo completo.
2. **Temperatura real:** `requiere_refrigeracion` y el tipo de rack representan una regla lógica. Falta integrar rango de temperatura, humedad, alarmas y trazabilidad de sensores.
3. **Compatibilidad química fina:** la categoría química es exclusiva, pero todavía no existe matriz por clases incompatibles, inflamabilidad o normativa de sustancias peligrosas.
4. **FEFO completo:** el vencimiento influye en accesibilidad; la secuencia de despacho FEFO debe reforzarse en picking y reservas.
5. **Demanda histórica:** prioridad y categoría son datos explícitos. Una etapa posterior puede estimar rotación ABC/XYZ usando movimientos reales.
6. **Coste de reubicación:** la auditoría corrige incompatibilidades, pero no reorganiza cajas válidas por ganancia marginal. Un modo de re-slotting debe incluir coste de movimiento y ventana operativa.
7. **Base de datos de producción:** el bloqueo de filas debe ejecutarse sobre PostgreSQL. SQLite es adecuado para desarrollo, pero no ofrece el mismo comportamiento de concurrencia.

## 13. Conclusión

El Slotting v2 es consistente con el flujo actual de LogiSmart: primero protege las restricciones físicas y de seguridad, luego optimiza el uso del almacén y finalmente explica la decisión. Los datos locales quedaron calibrados, las dos asignaciones riesgosas fueron corregidas y no quedan inconsistencias activas detectadas.
