/**
 * LogiSmart AGV - Firmware para ESP32
 * 
 * Este firmware controla un carro transportador autónomo (AGV) utilizando:
 * - 2 Servomotores de rotación continua (Ruedas izquierda/derecha)
 * - 4 Sensores infrarrojos ópticos (Line Tracking & Intersecciones)
 * - Conexión WiFi para integrarse con la API REST de LogiSmart
 * - Soporte alternativo de control Serial para simulación o cableado directo
 * 
 * Librerías necesarias en Arduino IDE:
 * - ESP32Servo (para el control de los servomotores)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

// ==========================================
// 1. CONFIGURACIÓN DE RED Y SERVIDOR
// ==========================================
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* server_url = "http://192.168.1.100:8000"; // IP y puerto del servidor Django

// ==========================================
// 2. CONFIGURACIÓN DE HARDWARE (PINS)
// ==========================================
#define PIN_SERVO_IZQ    18
#define PIN_SERVO_DER    19

#define PIN_SEN_L_OUTER  34  // Sensor Izquierdo Exterior (Intersecciones)
#define PIN_SEN_L_INNER  32  // Sensor Izquierdo Interior (Seguimiento de línea)
#define PIN_SEN_R_INNER  33  // Sensor Derecho Interior (Seguimiento de línea)
#define PIN_SEN_R_OUTER  35  // Sensor Derecho Exterior (Intersecciones)

#define PIN_BUZZER       25  // Zumbador piezoeléctrico para alertas
#define PIN_LED_STATUS   2   // LED integrado del ESP32

// Configuración de umbral óptico (digital o analógico)
#define SENSORS_ARE_ANALOG true
#define UMBRAL_LINEA       2000  // Valor analógico de corte (línea negra vs fondo claro)
#define ESTADO_LÍNEA       HIGH  // HIGH si el sensor lee 1 en negro (digital)

// ==========================================
// 3. VELOCIDADES Y CALIBRACIÓN DE SERVOS
// ==========================================
// Los servos de rotación continua toman microsegundos para velocidad:
// - 1500 us: Parado
// - 1000 us: Velocidad máxima hacia atrás
// - 2000 us: Velocidad máxima hacia adelante
#define SERVO_STOP_US    1500
#define VEL_AVANCE_IZQ   1600   // Ajustar según alineación del carro (hacia adelante)
#define VEL_AVANCE_DER   1400   // El motor derecho suele ir en sentido opuesto físicamente
#define VEL_GIRO_IZQ     1400   
#define VEL_GIRO_DER     1400   

// ==========================================
// 4. ESTADOS Y VARIABLES DE NAVEGACIÓN
// ==========================================
enum State {
  STATE_ESPERANDO,   // Esperando comandos o ruta activa del servidor
  STATE_SIGUIENDO,   // Avanzando en línea recta siguiendo la pista
  STATE_GIRANDO_IZQ, // Ejecutando giro de 90° a la izquierda
  STATE_GIRANDO_DER, // Ejecutando giro de 90° a la derecha
  STATE_GIRO_180,    // Ejecutando giro de 180°
  STATE_OBSTACULO,   // Detenido por proximidad de obstáculo
  STATE_LLEGO        // Llegó a una parada para entrega/recogida
};

enum Heading {
  NORTH = 0, // Y+
  EAST  = 1, // X+
  SOUTH = 2, // Y-
  WEST  = 3  // X-
};

State estadoActual = STATE_ESPERANDO;
Heading orientacionActual = EAST; // Orientación inicial al arrancar el carro

int posX = 0;
int posY = 0;
int destX = 0;
int destY = 0;

// Estructuras para lectura de la ruta
int proximoX = 0;
int proximoY = 0;
bool tieneSiguienteNodo = false;

Servo servoIzq;
Servo servoDer;

unsigned long ultimoFiltroRuta = 0;
const int intervaloPolling = 1500; // Milisegundos entre peticiones de estado al servidor

// ==========================================
// 5. FUNCIONES DE LECTURA DE SENSORES
// ==========================================
bool leeSensor(int pin) {
  if (SENSORS_ARE_ANALOG) {
    return analogRead(pin) > UMBRAL_LINEA;
  } else {
    return digitalRead(pin) == ESTADO_LÍNEA;
  }
}

// Estructura de lectura rápida de línea
struct LineReading {
  bool lOuter;
  bool lInner;
  bool rInner;
  bool rOuter;
};

LineReading leerSensores() {
  LineReading lr;
  lr.lOuter = leeSensor(PIN_SEN_L_OUTER);
  lr.lInner = leeSensor(PIN_SEN_L_INNER);
  lr.rInner = leeSensor(PIN_SEN_R_INNER);
  lr.rOuter = leeSensor(PIN_SEN_R_OUTER);
  return lr;
}

// ==========================================
// 6. FUNCIONES DE MOVIMIENTO DE MOTORES
// ==========================================
void pararMotores() {
  servoIzq.writeMicroseconds(SERVO_STOP_US);
  servoDer.writeMicroseconds(SERVO_STOP_US);
}

void avanzarRecto() {
  servoIzq.writeMicroseconds(VEL_AVANCE_IZQ);
  servoDer.writeMicroseconds(VEL_AVANCE_DER);
}

void corregirDerecha() {
  // Ajuste suave: rueda izquierda avanza, rueda derecha reduce o frena
  servoIzq.writeMicroseconds(VEL_AVANCE_IZQ + 50);
  servoDer.writeMicroseconds(SERVO_STOP_US);
}

void corregirIzquierda() {
  // Ajuste suave: rueda derecha avanza, rueda izquierda reduce o frena
  servoIzq.writeMicroseconds(SERVO_STOP_US);
  servoDer.writeMicroseconds(VEL_AVANCE_DER - 50);
}

void girarIzqEje() {
  // Rueda izquierda atrás, rueda derecha adelante
  servoIzq.writeMicroseconds(1300);
  servoDer.writeMicroseconds(1300);
}

void girarDerEje() {
  // Rueda izquierda adelante, rueda derecha atrás
  servoIzq.writeMicroseconds(1700);
  servoDer.writeMicroseconds(1700);
}

// ==========================================
// 7. ARRANQUE Y CONFIGURACIÓN (SETUP)
// ==========================================
void setup() {
  Serial.begin(115200);
  
  // Pines de sensores como entrada
  pinMode(PIN_SEN_L_OUTER, INPUT);
  pinMode(PIN_SEN_L_INNER, INPUT);
  pinMode(PIN_SEN_R_INNER, INPUT);
  pinMode(PIN_SEN_R_OUTER, INPUT);
  
  // Salidas adicionales
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  // Adjuntar servos
  servoIzq.attach(PIN_SERVO_IZQ);
  servoDer.attach(PIN_SERVO_DER);
  pararMotores();

  digitalWrite(PIN_LED_STATUS, LOW);
  sonarBip(200);

  // Inicializar Conexión WiFi
  Serial.println("\nConectando a WiFi...");
  WiFi.begin(ssid, password);
  
  // Esperar un máximo de 10 segundos por conexión
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n¡Conectado a WiFi!");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_LED_STATUS, HIGH); // LED fijo = WiFi Conectado
    sonarBip(100);
    delay(100);
    sonarBip(100);
  } else {
    Serial.println("\nNo se pudo conectar a WiFi. Operando en modo offline/Serial.");
    digitalWrite(PIN_LED_STATUS, LOW); // LED apagado = Modo Serial/Offline
  }
}

// ==========================================
// 8. COMUNICACIÓN CON LA API DE LOGISMART
// ==========================================

void obtenerEstadoServidor() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(server_url) + "/api/estado-carro/";
  http.begin(url);
  
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Estado recibido: " + payload);
    
    // Parseo simple de JSON (para evitar dependencias grandes)
    // Buscamos: "estado":"..."
    int idxEstado = payload.indexOf("\"estado\":\"");
    if (idxEstado != -1) {
      int start = idxEstado + 10;
      int end = payload.indexOf("\"", start);
      String backendEstado = payload.substring(start, end);
      
      // Leer posición actual reportada por el servidor
      posX = obtenerValorIntJSON(payload, "pos_x");
      posY = obtenerValorIntJSON(payload, "pos_y");
      destX = obtenerValorIntJSON(payload, "destino_x");
      destY = obtenerValorIntJSON(payload, "destino_y");

      if (backendEstado == "moviendo" || backendEstado == "regresando") {
        // El servidor tiene una ruta activa. Extraemos el siguiente nodo
        // Buscamos dentro del array "ruta" el primer elemento: [{"x":X,"y":Y}]
        int idxRuta = payload.indexOf("\"ruta\":[");
        if (idxRuta != -1) {
          int startRuta = idxRuta + 8;
          int endRuta = payload.indexOf("]", startRuta);
          String rutaStr = payload.substring(startRuta, endRuta);
          
          if (rutaStr.length() > 5) {
            // Hay coordenadas pendientes en la ruta
            proximoX = obtenerValorIntJSON(rutaStr, "x");
            proximoY = obtenerValorIntJSON(rutaStr, "y");
            tieneSiguienteNodo = true;
            
            if (estadoActual == STATE_ESPERANDO) {
              Serial.printf("Comenzando movimiento hacia proximo nodo (%d, %d)\n", proximoX, proximoY);
              planificarSiguientePaso();
            }
          } else {
            tieneSiguienteNodo = false;
          }
        }
      } else if (backendEstado == "llego") {
        if (estadoActual != STATE_LLEGO) {
          estadoActual = STATE_LLEGO;
          pararMotores();
          Serial.println("Carro llegó al destino de parada. Esperando confirmación...");
          sonarBip(500);
        }
      } else {
        estadoActual = STATE_ESPERANDO;
        pararMotores();
      }
    }
  } else {
    Serial.printf("[HTTP] GET falló, error: %d\n", httpCode);
  }
  http.end();
}

void notificarAvanceServidor() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(server_url) + "/api/estado-carro/avanzar/";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST("{}");
  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
    String payload = http.getString();
    Serial.println("Avance confirmado por servidor: " + payload);
    sonarBip(150);
  } else {
    Serial.printf("[HTTP] POST avanzar falló, error: %d\n", httpCode);
  }
  http.end();
}

void notificarConfirmarParada() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(server_url) + "/api/estado-carro/confirmar_parada/";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Envía operador id por defecto 1
  String payload = "{\"id_usuario\": 1}";
  int httpCode = http.POST(payload);
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("Parada confirmada exitosamente.");
    sonarBip(100);
    delay(100);
    sonarBip(100);
    estadoActual = STATE_ESPERANDO;
  } else {
    Serial.printf("[HTTP] POST confirmar_parada falló, error: %d\n", httpCode);
  }
  http.end();
}

// Auxiliar de parsing de JSON básico
int obtenerValorIntJSON(String json, String key) {
  int idx = json.indexOf("\"" + key + "\":");
  if (idx == -1) {
    // Intentar sin comillas en la key (formato simplificado)
    idx = json.indexOf(key + ":");
    if (idx == -1) return 0;
    int start = idx + key.length() + 1;
    int end = json.indexOf(",", start);
    if (end == -1) end = json.indexOf("}", start);
    return json.substring(start, end).toInt();
  }
  int start = idx + key.length() + 3;
  int end = json.indexOf(",", start);
  if (end == -1) end = json.indexOf("}", start);
  return json.substring(start, end).toInt();
}

// ==========================================
// 9. LÓGICA DE NAVEGACIÓN Y GIROS (ALGORITMO)
// ==========================================

void planificarSiguientePaso() {
  if (!tieneSiguienteNodo) {
    estadoActual = STATE_ESPERANDO;
    pararMotores();
    return;
  }

  // Determinar dirección requerida para ir de (posX, posY) a (proximoX, proximoY)
  Heading direccionRequerida = orientacionActual;

  if (proximoX > posX) {
    direccionRequerida = EAST;
  } else if (proximoX < posX) {
    direccionRequerida = WEST;
  } else if (proximoY > posY) {
    direccionRequerida = NORTH;
  } else if (proximoY < posY) {
    direccionRequerida = SOUTH;
  }

  // Calcular la diferencia de giro
  int giro = (direccionRequerida - orientacionActual + 4) % 4;

  if (giro == 0) {
    // Mismo sentido: Seguir de frente
    Serial.println("Acción: Seguir recto.");
    estadoActual = STATE_SIGUIENDO;
  } else if (giro == 1) {
    // Girar a la derecha
    Serial.println("Acción: Girar a la derecha.");
    estadoActual = STATE_GIRANDO_DER;
    iniciarGiro(true);
  } else if (giro == 3) {
    // Girar a la izquierda
    Serial.println("Acción: Girar a la izquierda.");
    estadoActual = STATE_GIRANDO_IZQ;
    iniciarGiro(false);
  } else if (giro == 2) {
    // Giro de 180 grados
    Serial.println("Acción: Giro 180°.");
    estadoActual = STATE_GIRO_180;
    iniciarGiro180();
  }

  orientacionActual = direccionRequerida;
}

void iniciarGiro(bool derecha) {
  sonarBip(80);
  
  // 1. Avanzar un poco para posicionar el eje de las ruedas en la intersección
  avanzarRecto();
  delay(250);
  
  // 2. Comenzar la rotación
  if (derecha) {
    girarDerEje();
  } else {
    girarIzqEje();
  }
  
  // 3. Esperar a salir de la línea actual
  delay(300); 
  
  // 4. Seguir rotando hasta que los sensores del medio vuelvan a detectar la línea
  unsigned long timeout = millis();
  while (millis() - timeout < 2500) {
    LineReading lr = leerSensores();
    if (lr.lInner || lr.rInner) {
      // Línea encontrada
      break;
    }
    delay(10);
  }
  
  pararMotores();
  delay(100);
  estadoActual = STATE_SIGUIENDO;
}

void iniciarGiro180() {
  sonarBip(80);
  delay(100);
  sonarBip(80);

  // Girar en el eje
  girarDerEje();
  delay(600); // Dar suficiente tiempo para rotar y salir de la línea

  unsigned long timeout = millis();
  while (millis() - timeout < 3500) {
    LineReading lr = leerSensores();
    if (lr.lInner || lr.rInner) {
      break;
    }
    delay(10);
  }

  pararMotores();
  delay(100);
  estadoActual = STATE_SIGUIENDO;
}

// ==========================================
// 10. BUCLE DE CONTROL PRINCIPAL (LOOP)
// ==========================================
void loop() {
  // --- MODO WIRELESS WIFI ---
  if (WiFi.status() == WL_CONNECTED) {
    
    // Polling periódico para obtener la ruta
    if (estadoActual == STATE_ESPERANDO && (millis() - ultimoFiltroRuta > intervaloPolling)) {
      ultimoFiltroRuta = millis();
      obtenerEstadoServidor();
    }

    if (estadoActual == STATE_LLEGO) {
      // Simular espera de 5 segundos en la parada física, luego autoconfirmar recogida/entrega
      // En un caso real, esto podría ser activado por un sensor de peso o pulsador
      delay(5000);
      notificarConfirmarParada();
      obtenerEstadoServidor();
    }

    if (estadoActual == STATE_SIGUIENDO) {
      LineReading lr = leerSensores();

      // Detección de intersección: línea horizontal cruzada
      // Se activa cuando los sensores exteriores detectan negro
      if (lr.lOuter && lr.rOuter) {
        pararMotores();
        Serial.printf("Intersección detectada. Llegamos al nodo (%d, %d)\n", proximoX, proximoY);
        
        // Notificar al servidor que avanzamos un nodo en la ruta
        notificarAvanceServidor();
        
        // Obtener el siguiente nodo del servidor de inmediato
        obtenerEstadoServidor();
        
        if (estadoActual != STATE_LLEGO) {
          planificarSiguientePaso();
        }
      }
      else {
        // Algoritmo de seguimiento de línea básico
        if (lr.lInner && lr.rInner) {
          avanzarRecto();
        } 
        else if (lr.lInner && !lr.rInner) {
          corregirIzquierda();
        } 
        else if (!lr.lInner && lr.rInner) {
          corregirDerecha();
        }
        else {
          // Pérdida temporal: avanzar despacio buscando la pista
          servoIzq.writeMicroseconds(VEL_AVANCE_IZQ - 30);
          servoDer.writeMicroseconds(VEL_AVANCE_DER + 30);
        }
      }
    }
  }
  
  // --- MODO TESTING SERIAL (CABLE/SIMULADOR) ---
  else {
    // Si no hay WiFi, lee coordenadas del puerto Serial (formato: "X,Y\n")
    if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      
      int comaIdx = input.indexOf(',');
      if (comaIdx != -1) {
        proximoX = input.substring(0, comaIdx).toInt();
        proximoY = input.substring(comaIdx + 1).toInt();
        tieneSiguienteNodo = true;
        estadoActual = STATE_SIGUIENDO;
        
        Serial.printf("Comando Serial recibido: Moviendo a (%d, %d)\n", proximoX, proximoY);
        planificarSiguientePaso();
      }
    }

    if (estadoActual == STATE_SIGUIENDO) {
      LineReading lr = leerSensores();

      if (lr.lOuter && lr.rOuter) {
        pararMotores();
        posX = proximoX;
        posY = proximoY;
        tieneSiguienteNodo = false;
        estadoActual = STATE_ESPERANDO;
        
        // Responder al servidor serial
        Serial.println("ARRIVED");
        sonarBip(300);
      } 
      else {
        if (lr.lInner && lr.rInner) avanzarRecto();
        else if (lr.lInner && !lr.rInner) corregirIzquierda();
        else if (!lr.lInner && lr.rInner) corregirDerecha();
        else avanzarRecto();
      }
    }
  }

  delay(20); // Retardo del bucle de control para estabilidad
}

// ==========================================
// 11. FUNCIONES COMPLEMENTARIAS
// ==========================================
void sonarBip(int duracionMs) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(duracionMs);
  digitalWrite(PIN_BUZZER, LOW);
}
