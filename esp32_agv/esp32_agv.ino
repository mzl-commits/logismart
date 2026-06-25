/**
 * LogiSmart AGV Robot - ESP32 Firmware (v1.5 - N20 Motors & 4 Optical Sensors)
 * 
 * Este programa controla un vehículo guiado automatizado (AGV) utilizando un ESP32.
 * Controla 2 motores DC N20 mediante un puente H (L293D / L298N / TB6612) y 4 sensores ópticos.
 * 
 * CONFIGURACIÓN DE SENSORES (4 Sensores Ópticos):
 * 1. Sensor Infrarrojo Frontal Izquierdo (Seguidor de línea) -> Pin 32 (S1 / Interno Izq)
 * 2. Sensor Infrarrojo Frontal Derecho (Seguidor de línea)   -> Pin 18 (S2 / Interno Der)
 * 3. Sensor Infrarrojo Lateral Izquierdo (Contador de Nodos)  -> Pin 34 (S3 / Externo Izq)
 * 4. Sensor Infrarrojo Lateral Derecho (Contador de Nodos)   -> Pin 35 (S4 / Externo Der)
 * 
 * ACTUADORES (Motores N20 con Puente H):
 * - Motor Izquierdo (M1): ENA (PWM) -> Pin 33, IN1 -> Pin 25, IN2 -> Pin 14
 * - Motor Derecho (M2):   ENB (PWM) -> Pin 23, IN3 -> Pin 21, IN4 -> Pin 19
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ─── CONFIGURACIÓN DE PRUEBA Y DEPURACIÓN ─────────────────────────────────────
// Define esto como 'true' si quieres probar el seguidor de línea de forma autónoma
// inmediatamente al encenderse, sin esperar comandos MQTT del servidor.
const bool MODO_PRUEBA_OFFLINE = false;

// ─── CONFIGURACIÓN DE INVERSIÓN FÍSICA (FÁCIL CALIBRACIÓN) ────────────────────
// Si tu motor izquierdo gira al revés, cambia esto a 'true'
const bool INVERTIR_MOTOR_IZQ = false;
// Si tu motor derecho gira al revés, cambia esto a 'true'
const bool INVERTIR_MOTOR_DER = false;
// Si el carro gira a la izquierda cuando debería ir a la derecha (o viceversa), pon esto en 'true'
const bool INVERTIR_DIRECCION_GIRO = true;

// ─── COMPENSACIÓN DE VELOCIDAD FÍSICA (CALIBRACIÓN) ──────────────────────────
// Si el motor izquierdo gira muy lento en comparación al derecho, aumenta este factor (ej. 1.3, 1.5, 1.8)
// Si el motor derecho es el que gira lento, aumenta el factor derecho correspondientemente.
const float COMPENSACION_MOTOR_IZQ = 1.0; 
const float COMPENSACION_MOTOR_DER = 1.0;

// ─── CONFIGURACIÓN DE SEGUIDOR DE LÍNEA ──────────────────────────────────────
// MODO_STRADDLE = true: La línea negra va EN MEDIO de los dos sensores frontales.
//                       (Ambos sensores leen BLANCO en trayecto recto).
// MODO_STRADDLE = false: La línea negra va DEBAJO de ambos sensores.
//                       (Ambos sensores leen NEGRO en trayecto recto).
const bool MODO_STRADDLE = true; 

// Calibración de Polaridad de los sensores TCRT5000:
// Si tus sensores entregan HIGH (1) sobre la línea NEGRA y LOW (0) sobre la superficie BLANCA:
//   #define ESTADO_NEGRO HIGH
//   #define ESTADO_BLANCO LOW
// Si tus sensores entregan LOW (0) sobre la línea NEGRA y HIGH (1) sobre la superficie BLANCA:
//   #define ESTADO_NEGRO LOW
//   #define ESTADO_BLANCO HIGH
#define ESTADO_NEGRO HIGH
#define ESTADO_BLANCO LOW

// ─── CONFIGURACIÓN DE RED Y MQTT ─────────────────────────────────────────────
const char* ssid = "iPhone de Yuri";
const char* password = "12345678";

const char* mqtt_broker = "38.250.116.213";
const int mqtt_port = 1883;
const char* mqtt_user = "yuri";
const char* mqtt_pass = "Montescoli3";

const char* topic_telemetria = "logismart/carro/telemetria";
const char* topic_comando    = "logismart/carro/comando";

const int CARRO_ID = 1;

// ─── MAPEO DE PINES ──────────────────────────────────────────────────────────
// Sensores ópticos
#define PIN_LINE_LEFT   32   // Sensor frontal izquierdo (S1)
#define PIN_LINE_RIGHT  18   // Sensor frontal derecho (S2)
#define PIN_NODE_LEFT   34   // Sensor lateral izquierdo (S3)
#define PIN_NODE_RIGHT  35   // Sensor lateral derecho (S4)

// Puente H Motores N20
#define PIN_MOTOR_IN1   25   // Motor Izquierdo dir 1
#define PIN_MOTOR_IN2   14   // Motor Izquierdo dir 2
#define PIN_MOTOR_ENA   33   // Motor Izquierdo velocidad (PWM)
#define PIN_MOTOR_IN3   21   // Motor Derecho dir 1
#define PIN_MOTOR_IN4   19   // Motor Derecho dir 2
#define PIN_MOTOR_ENB   23   // Motor Derecho velocidad (PWM)

// ─── VARIABLES GLOBALES Y ESTADOS ────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

enum AGVState {
  ESPANDO = 0,    // "esperando"
  MOVIENDO = 1,   // "moviendo"
  LLEGO = 2,      // "llego"
  REGRESANDO = 3  // "regresando"
};
AGVState currentState = ESPANDO;

struct Coordinate {
  int x;
  int y;
};
Coordinate ruta[50];
int rutaSize = 0;
int currentStep = 0;
int posX = 0;
int posY = 0;
int destinoX = 0;
int destinoY = 0;
String cajaId = "";

// Sensores
bool valLineLeft = false;
bool valLineRight = false;
bool valNodeLeft = false;
bool valNodeRight = false;
int batteryPct = 100;

// Variables de Velocidad (PWM 0-255)
int baseSpeedForward = 120; // Rango típico N20: 80 a 200
int speedLeft = 0;
int speedRight = 0;

// Timers no bloqueantes
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 1000;
unsigned long lastNodeDetectionTime = 0;
const unsigned long nodeDebounceInterval = 1000; // 1 segundo de cooldown entre nodos
unsigned long lastMqttRetry = 0;

// ─── PROTOTIPOS DE FUNCIÓN ───────────────────────────────────────────────────
void setupWiFi();
void callback(char* topic, byte* payload, unsigned int length);
void reconnectMQTTNonBlocking();
void publishTelemetry(const char* action = NULL);
void setMotorsSpeed(int speedL, int speedR);
void updateLineFollowing();
void stopMotors();
void parseMoverCommand(JsonDocument& doc);
void processSerialCommands();

// ─── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600); // Fija a 9600 baudios
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("     INICIANDO LOGISMART AGV ROBOT v1.5      ");
  Serial.println("=============================================");
  Serial.println("Nota: Configura tu Monitor Serial a 9600 baudios.");

  // Configuración de pines de sensores
  pinMode(PIN_LINE_LEFT, INPUT_PULLUP);
  pinMode(PIN_LINE_RIGHT, INPUT_PULLUP);
  pinMode(PIN_NODE_LEFT, INPUT_PULLUP);
  pinMode(PIN_NODE_RIGHT, INPUT_PULLUP);

  // Configuración de pines de motores
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_ENA, OUTPUT);
  pinMode(PIN_MOTOR_IN3, OUTPUT);
  pinMode(PIN_MOTOR_IN4, OUTPUT);
  pinMode(PIN_MOTOR_ENB, OUTPUT);

  stopMotors();

  // Conexión WiFi no bloqueante
  setupWiFi();
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);

  if (MODO_PRUEBA_OFFLINE) {
    currentState = MOVIENDO;
    Serial.println("[INICIO] MODO PRUEBA OFFLINE ACTIVADO: Iniciando seguidor de línea.");
  } else {
    Serial.println("[INICIO] Modo normal: Esperando comandos MQTT o comandos por Monitor Serial.");
    Serial.println(" -> Escribe 'm' en el Monitor Serial para forzar inicio del movimiento.");
    Serial.println(" -> Escribe 's' para detener los motores.");
    Serial.println(" -> Escribe 'p' para ver el diagnóstico de sensores en tiempo real.");
  }
}

// ─── LOOP PRINCIPAL ──────────────────────────────────────────────────────────
void loop() {
  // Reconexión MQTT no bloqueante
  if (WiFi.status() == WL_CONNECTED) {
    reconnectMQTTNonBlocking();
    if (client.connected()) {
      client.loop();
    }
  }

  // Procesar comandos desde el Monitor Serial
  processSerialCommands();

  // 1. Leer Sensores
  valLineLeft  = (digitalRead(PIN_LINE_LEFT) == ESTADO_NEGRO);
  valLineRight = (digitalRead(PIN_LINE_RIGHT) == ESTADO_NEGRO);
  
  // Sensores laterales para detectar nodos
  valNodeLeft  = (digitalRead(PIN_NODE_LEFT) == ESTADO_NEGRO);
  valNodeRight = (digitalRead(PIN_NODE_RIGHT) == ESTADO_NEGRO);
  
  bool nodeDetected = (valNodeLeft || valNodeRight);

  // 2. Control de Movimiento y Máquina de Estados
  if (currentState == MOVIENDO || currentState == REGRESANDO) {
    // Seguir la línea negra
    updateLineFollowing();

    // Detección de nodos en los costados
    if (nodeDetected && (millis() - lastNodeDetectionTime > nodeDebounceInterval)) {
      lastNodeDetectionTime = millis();
      
      if (MODO_PRUEBA_OFFLINE) {
        Serial.printf("[NODO] Detectado (Modo Prueba Offline). Sensores: Izq=%d Der=%d\n", valNodeLeft, valNodeRight);
      } 
      else if (currentStep < rutaSize) {
        posX = ruta[currentStep].x;
        posY = ruta[currentStep].y;
        currentStep++;
        
        Serial.printf("[NODO] Cruzado. Posición actual en el grid: (%d, %d)\n", posX, posY);
        
        if (posX == destinoX && posY == destinoY) {
          stopMotors();
          if (currentState == REGRESANDO) {
            currentState = ESPANDO;
            Serial.println("[DESTINO] Llegada a base (0,0) confirmada. Esperando.");
            publishTelemetry("confirmar_parada");
          } else {
            currentState = LLEGO;
            Serial.println("[DESTINO] Llegada a destino de entrega confirmada. Esperando.");
            publishTelemetry("confirmar_parada");
          }
        } else {
          publishTelemetry("avanzar");
        }
      }
    }
  } 
  else {
    stopMotors();
  }

  // 3. Telemetría Periódica (Cada 1 segundo)
  if (millis() - lastTelemetryTime > telemetryInterval) {
    lastTelemetryTime = millis();
    
    // Decrementamos la batería de forma virtual mientras el robot esté en movimiento
    if ((currentState == MOVIENDO || currentState == REGRESANDO) && batteryPct > 0) {
      batteryPct = max(0, batteryPct - 1);
    }
    
    if (client.connected()) {
      publishTelemetry();
    } else {
      Serial.printf("[DIAGNÓSTICO OFFLINE] Estado: %d | Pos: (%d,%d) | Bat: %d%% | Sensores: L_ext=%d L_int=%d R_int=%d R_ext=%d\n", 
                    currentState, posX, posY, batteryPct, valNodeLeft, valLineLeft, valLineRight, valNodeRight);
    }
  }

  delay(20);
}

// ─── CONTROL DE MOTORES DC CON PUENTE H ──────────────────────────────────────
void setMotorsSpeed(int speedL, int speedR) {
  // Aplicar factores de compensación física
  speedL = (int)(speedL * COMPENSACION_MOTOR_IZQ);
  speedR = (int)(speedR * COMPENSACION_MOTOR_DER);

  // Ajuste por inversión física de motores
  if (INVERTIR_MOTOR_IZQ) speedL = -speedL;
  if (INVERTIR_MOTOR_DER) speedR = -speedR;

  // Límite de seguridad de velocidades (0 a 255)
  speedL = constrain(speedL, -255, 255);
  speedR = constrain(speedR, -255, 255);

  // Motor Izquierdo (M1)
  if (speedL > 0) {
    digitalWrite(PIN_MOTOR_IN1, LOW);
    digitalWrite(PIN_MOTOR_IN2, HIGH);
    analogWrite(PIN_MOTOR_ENA, speedL);
  } else if (speedL < 0) {
    digitalWrite(PIN_MOTOR_IN1, HIGH);
    digitalWrite(PIN_MOTOR_IN2, LOW);
    analogWrite(PIN_MOTOR_ENA, -speedL);
  } else {
    digitalWrite(PIN_MOTOR_IN1, LOW);
    digitalWrite(PIN_MOTOR_IN2, LOW);
    analogWrite(PIN_MOTOR_ENA, 0);
  }

  // Motor Derecho (M2)
  if (speedR > 0) {
    digitalWrite(PIN_MOTOR_IN3, LOW);
    digitalWrite(PIN_MOTOR_IN4, HIGH);
    analogWrite(PIN_MOTOR_ENB, speedR);
  } else if (speedR < 0) {
    digitalWrite(PIN_MOTOR_IN3, HIGH);
    digitalWrite(PIN_MOTOR_IN4, LOW);
    analogWrite(PIN_MOTOR_ENB, -speedR);
  } else {
    digitalWrite(PIN_MOTOR_IN3, LOW);
    digitalWrite(PIN_MOTOR_IN4, LOW);
    analogWrite(PIN_MOTOR_ENB, 0);
  }
}

// ─── SEGUIMIENTO DE LÍNEA ADAPTATIVO ─────────────────────────────────────────
void updateLineFollowing() {
  bool irRecto = false;
  bool girarIzquierda = false;
  bool girarDerecha = false;

  if (MODO_STRADDLE) {
    if (!valLineLeft && !valLineRight) {
      irRecto = true;
    } else if (valLineLeft && !valLineRight) {
      girarIzquierda = true;
    } else if (!valLineLeft && valLineRight) {
      girarDerecha = true;
    } else {
      irRecto = true;
    }
  } 
  else {
    if (valLineLeft && valLineRight) {
      irRecto = true;
    } else if (!valLineLeft && valLineRight) {
      girarDerecha = true;
    } else if (valLineLeft && !valLineRight) {
      girarIzquierda = true;
    } else {
      irRecto = true;
    }
  }

  // Ajuste por inversión de giro de software
  if (INVERTIR_DIRECCION_GIRO) {
    if (girarIzquierda || girarDerecha) {
      bool temp = girarIzquierda;
      girarIzquierda = girarDerecha;
      girarDerecha = temp;
    }
  }

  // Velocidades aplicadas a motores
  if (irRecto) {
    speedLeft = baseSpeedForward;
    speedRight = baseSpeedForward;
  } 
  else if (girarIzquierda) {
    speedLeft = -baseSpeedForward / 2;
    speedRight = baseSpeedForward;
  } 
  else if (girarDerecha) {
    speedLeft = baseSpeedForward;
    speedRight = -baseSpeedForward / 2;
  }

  setMotorsSpeed(speedLeft, speedRight);
}

void stopMotors() {
  speedLeft = 0;
  speedRight = 0;
  setMotorsSpeed(0, 0);
}

// ─── CONEXIÓN WIFI ───────────────────────────────────────────────────────────
void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.printf("Conectando a Wi-Fi: %s\n", ssid);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 12) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n¡Wi-Fi conectado con éxito!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nNo se pudo conectar a Wi-Fi en el inicio. Ejecutando en segundo plano.");
  }
}

// ─── CONEXIÓN MQTT NO BLOQUEANTE ─────────────────────────────────────────────
void reconnectMQTTNonBlocking() {
  if (client.connected()) return;

  if (millis() - lastMqttRetry > 10000) {
    lastMqttRetry = millis();
    Serial.println("Intentando conectar al broker MQTT...");
    String clientId = "LogiSmartAGV-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("¡MQTT Conectado!");
      client.subscribe(topic_comando);
    } else {
      Serial.printf("Fallo de conexión MQTT, rc=%d. Reintentando en 10 segundos.\n", client.state());
    }
  }
}

// ─── PROCESADOR DE COMANDOS ENTRANTES (SUSCRIPTOR) ───────────────────────────
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.printf("Mensaje recibido [%s]: %s\n", topic, msg.c_str());

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) {
    Serial.printf("Error deserializando JSON: %s\n", error.c_str());
    return;
  }

  int targetCarroId = doc["carro_id"] | 0;
  if (targetCarroId != CARRO_ID) return;

  String action = doc["action"] | "";
  if (action == "mover") {
    parseMoverCommand(doc);
  } 
  else if (action == "stop" || action == "detener") {
    currentState = ESPANDO;
    stopMotors();
    Serial.println("Comando STOP. Robot detenido.");
    publishTelemetry();
  }
}

void parseMoverCommand(JsonDocument& doc) {
  destinoX = doc["destino_x"] | 0;
  destinoY = doc["destino_y"] | 0;
  cajaId = doc["caja_id"] | "";
  
  JsonArray routeArr = doc["ruta"].as<JsonArray>();
  rutaSize = 0;
  for (JsonVariant v : routeArr) {
    if (rutaSize < 50) {
      ruta[rutaSize].x = v["x"] | 0;
      ruta[rutaSize].y = v["y"] | 0;
      rutaSize++;
    }
  }

  currentStep = 0;
  if (rutaSize > 0) {
    if (destinoX == 0 && destinoY == 0) {
      currentState = REGRESANDO;
    } else {
      currentState = MOVIENDO;
    }
    Serial.printf("Ruta iniciada a (%d, %d). Nodos totales: %d\n", destinoX, destinoY, rutaSize);
  }
}

// ─── ENVIAR TELEMETRÍA (PUBLICADOR) ──────────────────────────────────────────
void publishTelemetry(const char* action) {
  JsonDocument doc;
  
  doc["carro_id"] = CARRO_ID;
  if (action != NULL) {
    doc["action"] = action;
  }
  
  if (currentState == ESPANDO) doc["estado"] = "esperando";
  else if (currentState == MOVIENDO) doc["estado"] = "moviendo";
  else if (currentState == LLEGO) doc["estado"] = "llego";
  else if (currentState == REGRESANDO) doc["estado"] = "regresando";

  doc["pos_x"] = posX;
  doc["pos_y"] = posY;
  doc["destino_x"] = destinoX;
  doc["destino_y"] = destinoY;
  doc["caja_id"] = (cajaId == "") ? nullptr : cajaId.c_str();
  doc["parada_actual"] = currentStep;
  doc["bateria_pct"] = batteryPct;

  doc["sensor_opt_izq_ext"] = valNodeLeft;
  doc["sensor_opt_izq_int"] = valLineLeft;
  doc["sensor_opt_der_int"] = valLineRight;
  doc["sensor_opt_der_ext"] = valNodeRight;
  doc["sensor_obstaculo_frontal"] = false;
  doc["sensor_obstaculo_trasero"] = false;

  doc["motor_izq_vel"] = speedLeft;
  doc["motor_der_vel"] = speedRight;

  String output;
  serializeJson(doc, output);
  client.publish(topic_telemetria, output.c_str());
}

// ─── PROCESAR COMANDOS SERIALES DE DEPURACIÓN ─────────────────────────────────
void processSerialCommands() {
  if (Serial.available() > 0) {
    char cmdChar = Serial.read();
    
    if (cmdChar == '\n' || cmdChar == '\r') return;
    
    if (cmdChar == 'm' || cmdChar == 'M') {
      currentState = MOVIENDO;
      Serial.println("\n>>> [COMANDO MANUAL] Iniciando seguidor de línea (Estado: MOVIENDO)...");
    }
    else if (cmdChar == 's' || cmdChar == 'S') {
      currentState = ESPANDO;
      stopMotors();
      Serial.println("\n>>> [COMANDO MANUAL] Deteniendo motores (Estado: ESPERANDO)...");
    }
    else if (cmdChar == 'p' || cmdChar == 'P') {
      bool rLeft = digitalRead(PIN_LINE_LEFT);
      bool rRight = digitalRead(PIN_LINE_RIGHT);
      bool rNodeL = digitalRead(PIN_NODE_LEFT);
      bool rNodeR = digitalRead(PIN_NODE_RIGHT);
      
      Serial.println("\n=============================================");
      Serial.println("           DIAGNÓSTICO DE SENSORES           ");
      Serial.println("=============================================");
      Serial.printf("Sensor Lateral Izquierdo S3 (Pin %d): %s (Físico: %d)\n", 
                    PIN_NODE_LEFT, (rNodeL == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rNodeL);
      Serial.printf("Sensor Frontal Izquierdo S1 (Pin %d): %s (Físico: %d)\n", 
                    PIN_LINE_LEFT, (rLeft == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rLeft);
      Serial.printf("Sensor Frontal Derecho   S2 (Pin %d): %s (Físico: %d)\n", 
                    PIN_LINE_RIGHT, (rRight == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rRight);
      Serial.printf("Sensor Lateral Derecho   S4 (Pin %d): %s (Físico: %d)\n", 
                    PIN_NODE_RIGHT, (rNodeR == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rNodeR);
      Serial.println("---------------------------------------------");
      Serial.printf("Motores DC N20: Izquierda = %d | Derecha = %d\n", speedLeft, speedRight);
      Serial.printf("Estado del AGV: %d (%s) | Batería: %d%%\n", 
                    currentState, 
                    (currentState == ESPANDO) ? "ESPERANDO" : 
                    (currentState == MOVIENDO) ? "MOVIENDO" : 
                    (currentState == LLEGO) ? "LLEGÓ" : "REGRESANDO",
                    batteryPct);
      Serial.println("=============================================");
    }
  }
}
