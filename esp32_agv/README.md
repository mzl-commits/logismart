# Guía de Conexión y Funcionamiento del Carro AGV (ESP32)

Este directorio contiene el firmware C++ (`esp32_agv.ino`) para el microcontrolador **ESP32** que gobierna el carro automatizado (AGV). El carro navega de forma autónoma siguiendo líneas en una cuadrícula (grid) y se comunica con el servidor Django de LogiSmart para recibir rutas optimizadas.

---

## 🔌 Diagrama de Conexiones Eléctricas

A continuación se detalla cómo conectar los servomotores, los sensores ópticos de seguimiento de línea y los sensores de proximidad/obstáculos al ESP32:

```
                      ┌──────────────────────┐
                      │    ESP32 DEVKIT V1   │
                      └──────────┬───────────┘
                                 │
     [GND] ──────────────────────┼────────────────────── [GND (Sensores/Servos)]
     [5V o VIN] ─────────────────┼────────────────────── [VCC / V+ Ruedas (5V-6V)]
                                 │
     [GPIO 18] ──────────────────┼─── (Señal) ─────────── [Servo Continuo Izquierdo]
     [GPIO 19] ──────────────────┼─── (Señal) ─────────── [Servo Continuo Derecho]
                                 │
     [GPIO 34] ──────────────────┼─── (OUT/Digital) ───── [Sensor Proximidad/Obstáculo Delantero]
     [GPIO 32] ──────────────────┼─── (OUT/Analógico) ─── [Sensor Óptico Línea Izquierdo]
     [GPIO 33] ──────────────────┼─── (OUT/Analógico) ─── [Sensor Óptico Línea Derecho]
     [GPIO 35] ──────────────────┼─── (OUT/Digital) ───── [Sensor Proximidad/Obstáculo Trasero]
                                 │
     [GPIO 25] ──────────────────┼─── (Señal +) ───────── [Zumbador Alertas]
     [GPIO 2 (LED Onboard)] ─────┼─── (Status) ────────── [LED WiFi / Estado / Obstáculo]
```

> [!IMPORTANT]
> **Alimentación Externa:** No alimentes los servomotores directamente desde el pin de 3.3V del ESP32. Usa una fuente de alimentación externa de 5V o 6V (como un banco de baterías USB o baterías recargables NiMH) compartiendo el polo negativo (GND) con el ESP32.

---

## ⚙️ Modos de Distribución de Sensores

El firmware soporta dos modos de configuración mediante el parámetro `#define CONFIG_MODO_SENSORES`:

### MODO A: Navegación de Línea + Seguridad Activa (Recomendado)
- **Seguimiento de Línea:** Pines **32** (Línea Izquierda) y **33** (Línea Derecha).
- **Evitar Colisiones (Obstáculos):** Pin **34** (Obstáculo Frontal) y Pin **35** (Obstáculo Trasero).
- **Cómo funciona:**
  - Si el carro avanza y el sensor frontal (Pin 34) detecta un objeto aproximándose, se detiene inmediatamente, emite pitidos intermitentes de advertencia y pausa la comunicación. Al retirarse el obstáculo por 1.5s, reanuda automáticamente su recorrido.
  - La detección de intersecciones se simula cuando ambos sensores de línea (32 y 33) pasan sobre la línea transversal negra simultáneamente.

### MODO B: Navegación de Alta Precisión (Sin seguridad de proximidad)
- **Seguimiento completo:** Pin 34 (Línea Exterior Izquierda), Pin 32 (Línea Interior Izquierda), Pin 33 (Línea Interior Derecha) y Pin 35 (Línea Exterior Derecha).
- **Cómo funciona:** Usa los 4 sensores alineados en la base únicamente para seguir pista y detectar intersecciones muy precisas, sin prevención de colisión por hardware.

---

## 🛠️ Configuración en Arduino IDE

Para cargar el programa al ESP32, sigue estos pasos:

1. **Instalar el soporte de ESP32:**
   - Abre Arduino IDE, ve a `Archivo` -> `Preferencias`.
   - En *Gestor de URLs Adicionales de Tarjetas*, pega:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Ve a `Herramientas` -> `Placa` -> `Gestor de Tarjetas`, busca **esp32** e instálalo.

2. **Instalar la librería de Servomotores:**
   - Ve a `Programa` -> `Incluir Librería` -> `Gestor de Librerías`.
   - Busca **ESP32Servo** (desarrollada por Kevin Harrington) e instálala. *Esta librería permite usar PWM en los temporizadores del ESP32 para controlar servos correctamente.*

3. **Configurar las credenciales en el código:**
   - Abre `esp32_agv.ino`.
   - Modifica el SSID y la contraseña de tu WiFi:
     ```cpp
     const char* ssid = "TU_WIFI_SSID";
     const char* password = "TU_WIFI_PASSWORD";
     ```
   - Actualiza la dirección IP del servidor Django (donde se ejecuta `manage.py runserver`):
     ```cpp
     const char* server_url = "http://192.168.1.100:8000"; 
     ```

---

## 📐 Distribución de Sensores en la Base (MODO A)

Si usas el **MODO A** para seguridad, monta los sensores de la siguiente manera:

```
          [ Sensor Proximidad Frontal ]
                    (Pin 34)
              Alineado hacia el frente
             
         ─────────────────────────────────
                   Chasis Carro
         ─────────────────────────────────
         
            [ Sen. Línea Izq ]  [ Sen. Línea Der ]
                (Pin 32)            (Pin 33)
             Apuntando verticalmente al suelo
             
         ─────────────────────────────────
                   Chasis Carro
         ─────────────────────────────────
             
          [ Sensor Proximidad Trasero ]
                    (Pin 35)
              Alineado hacia atrás
```

- **Sensores de Seguimiento:** Los sensores centrales (32 y 33) deben estar separados por un ancho menor al de la línea negra o posicionarse en los bordes de la misma para la corrección de dirección.
- **Sensores de Proximidad:** Ajusta el potenciómetro físico integrado en los módulos de proximidad IR para definir el rango de detección del obstáculo (por ejemplo, entre 10 cm y 30 cm de distancia). En estos módulos, el pin digital `OUT` suele enviar `LOW` al activarse. Si tu sensor funciona al revés, cambia `#define OBSTACLE_ACTIVE_STATE HIGH` en el código.

---

## ⚙️ Calibración de Motores y Sensores

### 1. Calibración del Punto de Parada (Servos)
Los servomotores de rotación continua toman una señal de parada de aproximadamente `1500` microsegundos.
- Si el carro se mueve lentamente estando parado, ajusta el valor `#define SERVO_STOP_US` (por ejemplo, a `1495` o `1505`) hasta que las ruedas se queden completamente inmóviles.

### 2. Calibración de Velocidades
Dependiendo de la orientación física del servo, uno girará al revés del otro para avanzar en línea recta.
- Ajusta `VEL_AVANCE_IZQ` (mayor a 1500) y `VEL_AVANCE_DER` (menor a 1500) hasta obtener un avance equilibrado.

### 3. Calibración Óptica
El umbral de lectura está definido en `#define UMBRAL_LINEA 2000` (rango analógico de 0 a 4095).
- Abre el Monitor Serie y observa las lecturas de los sensores.
- Configura el umbral a un valor intermedio entre la lectura obtenida sobre el suelo claro (bajo voltaje/lectura) y sobre la línea negra de la pista (alto voltaje/lectura).

---

## 🧠 Algoritmo de Navegación del Grid (X, Y)

El carro realiza un seguimiento dinámico de su orientación física mediante un sistema de cabeceras (`Heading`):
- `NORTH` (Avanzar sobre Y+)
- `EAST`  (Avanzar sobre X+)
- `SOUTH` (Avanzar sobre Y-)
- `WEST`  (Avanzar sobre X-)

Cuando el servidor Django calcula la ruta paso a paso (ejemplo: `(0,0) -> (1,0) -> (1,1)`), el carro:
1. Compara las coordenadas actuales con el siguiente nodo de destino.
2. Calcula la diferencia angular entre la orientación requerida y la actual:
   $$\text{giro} = (\text{direccionRequerida} - \text{orientacionActual} + 4) \pmod 4$$
3. Realiza la maniobra física necesaria:
   - **Diferencia = 0:** Seguir de frente.
   - **Diferencia = 1:** Girar 90° a la derecha en el eje.
   - **Diferencia = 3:** Girar 90° a la izquierda en el eje.
   - **Diferencia = 2:** Girar 180° en el eje.
4. Una vez completado el giro, avanza siguiendo la línea hasta la siguiente intersección, donde llama a la API `/api/estado-carro/avanzar/` para actualizar la base de datos y repetir el ciclo.
