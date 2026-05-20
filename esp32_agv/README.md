# Guía de Conexión y Funcionamiento del Carro AGV (ESP32)

Este directorio contiene el firmware C++ (`esp32_agv.ino`) para el microcontrolador **ESP32** que gobierna el carro automatizado (AGV). El carro navega de forma autónoma siguiendo líneas en una cuadrícula (grid) y se comunica con el servidor Django de LogiSmart para recibir rutas optimizadas.

---

## 🔌 Diagrama de Conexiones Eléctricas

A continuación se detalla cómo conectar los servomotores, los sensores ópticos de proximidad (TCRT5000) y los periféricos de alerta al ESP32:

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
     [GPIO 34 (ADC/Analog)] ─────┼─── (Salida OUT) ────── [Sensor Óptico Izq. Exterior]
     [GPIO 32 (ADC/Analog)] ─────┼─── (Salida OUT) ────── [Sensor Óptico Izq. Interior]
     [GPIO 33 (ADC/Analog)] ─────┼─── (Salida OUT) ────── [Sensor Óptico Der. Interior]
     [GPIO 35 (ADC/Analog)] ─────┼─── (Salida OUT) ────── [Sensor Óptico Der. Exterior]
                                 │
     [GPIO 25] ──────────────────┼─── (Señal +) ───────── [Zumbador Alertas]
     [GPIO 2 (LED Onboard)] ─────┼─── (Status) ────────── [LED WiFi / Estado]
```

> [!IMPORTANT]
> **Alimentación Externa:** No alimentes los servomotores directamente desde el pin de 3.3V del ESP32. Usa una fuente de alimentación externa de 5V o 6V (como un banco de baterías USB o baterías recargables NiMH) compartiendo el polo negativo (GND) con el ESP32.

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

## 📐 Distribución de Sensores en la Base

Los 4 sensores infrarrojos TCRT5000 deben colocarse alineados horizontalmente en la parte frontal inferior del carro, con una separación aproximada de 1.5 cm a 2.5 cm entre ellos:

```
      [ Izq. Exterior ]   [ Izq. Interior ]   [ Der. Interior ]   [ Der. Exterior ]
           (34)                (32)                (33)                (35)
            │                   │                   │                   │
            ▼                   ▼                   ▼                   ▼
    Detecta cruces de    Sigue la línea      Sigue la línea     Detecta cruces de
     línea horizontal       pista (izq)         pista (der)      línea horizontal
```

- **Seguimiento de Pista:** Los sensores interiores (32 y 33) actúan como la guía del camino. El carro corrige su rumbo si uno de ellos sale de la línea.
- **Intersección (Cruce de Grid):** Cuando ambos sensores exteriores (34 y 35) detectan la línea negra transversal simultáneamente, el carro reconoce que ha llegado a una coordenada física e incrementa su posición en el eje actual.

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
