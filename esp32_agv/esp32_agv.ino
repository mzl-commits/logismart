/**
 * LogiSmart AGV Robot - ESP32 Firmware (v1.3 - Corregido y Optimizado)
 * 
 * Este programa controla un vehículo guiado automatizado (AGV) utilizando un ESP32.
 * Incorpora conexión no bloqueante para poder calibrar y probar el robot de forma offline.
 * 
 * CONFIGURACIÓN DE SENSORES (4 Sensores en total):
 * 1. Sensor Infrarrojo Frontal Izquierdo (Seguidor de línea) -> Pin 32
 * 2. Sensor Infrarrojo Frontal Derecho (Seguidor de línea)   -> Pin 33
 * 3. Sensor Infrarrojo Lateral Derecho (Contador de Nodos)   -> Pin 25 (Delante de la rueda derecha)
 * 4. Sensor de Obstáculos Frontal Ultrasonidos HC-SR04        -> Trig: Pin 26, Echo: Pin 27
 * 
 * ACTUADORES:
 * - Servomotor Rotación Continua Izquierdo -> Pin 18 (Pulsos: 1000us max rev, 1500us stop, 2000us max forward)
 * - Servomotor Rotación Continua Derecho   -> Pin 19 (Pulsos: 1000us max rev, 1500us stop, 2000us max forward)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ─── CONFIGURACIÓN DE PRUEBA Y DEPURACIÓN ─────────────────────────────────────
// Define esto como 'true' si quieres probar el seguidor de línea de forma autónoma
// inmediatamente al encenderse, sin esperar comandos MQTT del servidor.
const bool MODO_PRUEBA_OFFLINE = false;

// Habilitar/Deshabilitar el sensor de ultrasonidos (HC-SR04)
// Si no tienes el sensor conectado, configúralo en 'false' para evitar lecturas flotantes falsas.
const bool USAR_ULTRASONIDO = true;

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
// Si tus sensores entregan LOW (0) sobre la línea NEGRA y HIGH (1) sobre la superficie BLANCA (invertidos):
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
#define PIN_LINE_LEFT   32   // Sensor frontal izquierdo
#define PIN_LINE_RIGHT  33   // Sensor frontal derecho
#define PIN_NODE_RIGHT  25   // Sensor contador de nodos lateral derecho
#define PIN_TRIG        26   // HC-SR04 Trig
#define PIN_ECHO        27   // HC-SR04 Echo
#define PIN_MOTOR_LEFT  18   // Servomotor izquierdo
#define PIN_MOTOR_RIGHT 19   // Servomotor derecho
#define PIN_BATTERY     34   // Medidor de batería analógica

// ─── VARIABLES GLOBALES Y ESTADOS ────────────────────────────────────────────
Servo motorLeft;
Servo motorRight;
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
bool valNodeRight = false;
bool valObstacle = false;
float distanceCm = 999.0;
int batteryPct = 100;

// Variables de Velocidad (us)
// Ajusta baseSpeedForward si el carro no tiene fuerza (zumba pero no se mueve)
int baseSpeedForward = 250; // Rango típico: 100 a 400 (sobre 1500us)
int speedLeft = 1500;
int speedRight = 1500;

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
float readDistance();
int getBatteryPercentage();
void updateLineFollowing();
void stopMotors();
void parseMoverCommand(JsonDocument& doc);
void processSerialCommands();

// ─── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("     INICIANDO LOGISMART AGV ROBOT v1.3      ");
  Serial.println("=============================================");

  // Configuración de pines de sensores
  pinMode(PIN_LINE_LEFT, INPUT_PULLUP);
  pinMode(PIN_LINE_RIGHT, INPUT_PULLUP);
  pinMode(PIN_NODE_RIGHT, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BATTERY, INPUT);

  // Adjuntar servomotores
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  motorLeft.setPeriodHertz(50);
  motorRight.setPeriodHertz(50);
  motorLeft.attach(PIN_MOTOR_LEFT, 1000, 2000);
  motorRight.attach(PIN_MOTOR_RIGHT, 1000, 2000);

  stopMotors();

  // Conexión WiFi no bloqueante (máximo 6 segundos)
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
  // valLineLeft y valLineRight serán TRUE si están sobre la línea NEGRA y FALSE sobre el fondo BLANCO
  valLineLeft  = (digitalRead(PIN_LINE_LEFT) == ESTADO_NEGRO);
  valLineRight = (digitalRead(PIN_LINE_RIGHT) == ESTADO_NEGRO);
  
  // El sensor contador de nodos también se activa al cruzar una línea negra transversal
  valNodeRight = (digitalRead(PIN_NODE_RIGHT) == ESTADO_NEGRO);
  
  // Detección de distancia
  if (USAR_ULTRASONIDO) {
    distanceCm = readDistance();
    // Obstáculo si la distancia es real y menor a 15cm (evitamos lecturas erróneas de 0cm)
    valObstacle = (distanceCm > 2.0 && distanceCm < 15.0);
  } else {
    distanceCm = 999.0;
    valObstacle = false;
  }

  // 2. Control de Movimiento y Máquina de Estados
  if (valObstacle) {
    // Freno inmediato si hay obstáculos detectados en el camino
    stopMotors();
    if (currentState == MOVIENDO || currentState == REGRESANDO) {
      Serial.printf("[OBSTÁCULO] ¡Detenido! Distancia: %.1f cm. Reanudará cuando el camino esté libre.\n", distanceCm);
      publishTelemetry("obstaculo");
    }
  } 
  else if (currentState == MOVIENDO || currentState == REGRESANDO) {
    // Seguir la línea negra
    updateLineFollowing();

    // Detección de nodos en el lado derecho (conteo de intersecciones)
    if (valNodeRight && (millis() - lastNodeDetectionTime > nodeDebounceInterval)) {
      lastNodeDetectionTime = millis();
      
      if (MODO_PRUEBA_OFFLINE) {
        Serial.println("[NODO] Detectado (Modo Prueba Offline).");
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
    batteryPct = getBatteryPercentage();
    
    if (client.connected()) {
      publishTelemetry();
    } else {
      // Si está offline, imprime el estado en el Monitor Serial para facilitar la calibración física
      Serial.printf("[DIAGNÓSTICO OFFLINE] Estado: %d | Pos: (%d,%d) | Bat: %d%% | Dist: %.1f cm | Sensores: L=%d R=%d Node=%d\n", 
                    currentState, posX, posY, batteryPct, distanceCm, valLineLeft, valLineRight, valNodeRight);
    }
  }

  delay(20);
}

// ─── SEGUIMIENTO DE LÍNEA ADAPTATIVO ─────────────────────────────────────────
void updateLineFollowing() {
  // Configuración de giro y dirección para servomotores de rotación continua:
  // Motor Izquierdo adelante -> velocidad > 1500 (us)
  // Motor Derecho adelante   -> velocidad < 1500 (us) (sentido inverso por montaje físico)
  
  bool irRecto = false;
  bool girarIzquierda = false;
  bool girarDerecha = false;

  if (MODO_STRADDLE) {
    // La línea negra va EN MEDIO de ambos sensores. 
    // Ambos leen BLANCO (false) cuando va centrado.
    if (!valLineLeft && !valLineRight) {
      irRecto = true;
    } else if (valLineLeft && !valLineRight) {
      // Se desvió a la derecha (el sensor izquierdo pisó la línea negra). Corregir a la izquierda.
      girarIzquierda = true;
    } else if (!valLineLeft && valLineRight) {
      // Se desvió a la izquierda (el sensor derecho pisó la línea negra). Corregir a la derecha.
      girarDerecha = true;
    } else {
      // Ambos leen negro (intersección o nodo transversal): Continuar recto
      irRecto = true;
    }
  } 
  else {
    // La línea negra va DEBAJO de ambos sensores. 
    // Ambos leen NEGRO (true) cuando va centrado.
    if (valLineLeft && valLineRight) {
      irRecto = true;
    } else if (!valLineLeft && valLineRight) {
      // El sensor izquierdo se salió de la línea (le Blanco). Corregir a la derecha.
      girarDerecha = true;
    } else if (valLineLeft && !valLineRight) {
      // El sensor derecho se salió de la línea (le Blanco). Corregir a la izquierda.
      girarIzquierda = true;
    } else {
      // Ambos leen blanco (se perdió la línea): Continuar recto a baja velocidad para reencontrarla
      irRecto = true;
    }
  }

  // Cálculo de los pulsos para los servomotores
  if (irRecto) {
    speedLeft = 1500 + baseSpeedForward;
    speedRight = 1500 - baseSpeedForward;
  } 
  else if (girarIzquierda) {
    // Para girar a la izquierda: desacelerar o retroceder rueda izquierda, avanzar derecha
    speedLeft = 1500 - (baseSpeedForward / 2);
    speedRight = 1500 - baseSpeedForward;
  } 
  else if (girarDerecha) {
    // Para girar a la derecha: avanzar rueda izquierda, desacelerar o retroceder derecha
    speedLeft = 1500 + baseSpeedForward;
    speedRight = 1500 + (baseSpeedForward / 2);
  }

  motorLeft.writeMicroseconds(speedLeft);
  motorRight.writeMicroseconds(speedRight);
}

void stopMotors() {
  speedLeft = 1500;
  speedRight = 1500;
  motorLeft.writeMicroseconds(1500);
  motorRight.writeMicroseconds(1500);
}

// ─── LEER ULTRASONIDO HC-SR04 ────────────────────────────────────────────────
float readDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  // Timeout de 25ms (aprox. 4 metros de rango máximo)
  long duration = pulseIn(PIN_ECHO, HIGH, 25000); 
  if (duration == 0) return 999.0;
  
  return duration * 0.0343 / 2.0;
}

// ─── BATERÍA ─────────────────────────────────────────────────────────────────
int getBatteryPercentage() {
  int raw = analogRead(PIN_BATTERY);
  // Asumiendo divisor de voltaje resistivo y batería de 7.4V (Lipo 2S)
  float voltage = (raw / 4095.0) * 3.3 * 2.5; 
  int pct = map(voltage * 100, 640, 840, 0, 100);
  if (pct > 100) pct = 100;
  if (pct < 0) pct = 0;
  return pct;
}

// ─── CONEXIÓN WIFI ───────────────────────────────────────────────────────────
void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.printf("Conectando a Wi-Fi: %s\n", ssid);
  
  int attempts = 0;
  // Intentar conectar por un máximo de 6 segundos en setup()
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

  // Intentar reconectar cada 10 segundos sin bloquear el loop principal
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
  else if (action == "stop") {
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

  doc["sensor_opt_izq_ext"] = false;
  doc["sensor_opt_izq_int"] = valLineLeft;
  doc["sensor_opt_der_int"] = valLineRight;
  doc["sensor_opt_der_ext"] = valNodeRight;
  doc["sensor_obstaculo_frontal"] = valObstacle;
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
    
    // Limpiar caracteres de control (\r o \n)
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
      // Lecturas en tiempo real
      bool rLeft = digitalRead(PIN_LINE_LEFT);
      bool rRight = digitalRead(PIN_LINE_RIGHT);
      bool rNode = digitalRead(PIN_NODE_RIGHT);
      
      Serial.println("\n=============================================");
      Serial.println("           DIAGNÓSTICO DE SENSORES           ");
      Serial.println("=============================================");
      Serial.printf("Sensor Frontal Izquierdo (Pin %d): %s (Físico: %d)\n", 
                    PIN_LINE_LEFT, (rLeft == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rLeft);
      Serial.printf("Sensor Frontal Derecho   (Pin %d): %s (Físico: %d)\n", 
                    PIN_LINE_RIGHT, (rRight == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rRight);
      Serial.printf("Sensor Contador Nodos    (Pin %d): %s (Físico: %d)\n", 
                    PIN_NODE_RIGHT, (rNode == ESTADO_NEGRO) ? "NEGRO" : "BLANCO", rNode);
      if (USAR_ULTRASONIDO) {
        Serial.printf("Sensor de Ultrasonidos  (Trig %d/Echo %d): %.1f cm (Obstáculo: %s)\n", 
                      PIN_TRIG, PIN_ECHO, distanceCm, valObstacle ? "SÍ (Detenido)" : "NO");
      } else {
        Serial.println("Sensor de Ultrasonidos  : DESACTIVADO");
      }
      Serial.printf("Motores: Izquierda = %d us | Derecha = %d us\n", speedLeft, speedRight);
      Serial.printf("Estado del AGV: %d (%s)\n", 
                    currentState, 
                    (currentState == ESPANDO) ? "ESPERANDO" : 
                    (currentState == MOVIENDO) ? "MOVIENDO" : 
                    (currentState == LLEGO) ? "LLEGÓ" : "REGRESANDO");
      Serial.println("=============================================");
    }
  }
}