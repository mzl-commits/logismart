/**
 * LogiSmart AGV Robot - ESP32 Firmware (v1.8 - N20 Motors & Navigation)
 * 
 * Este programa controla un vehículo guiado automatizado (AGV) utilizando un ESP32.
 * Soporta dos modos de funcionamiento:
 * 1. MODO SEGUIDOR DE LÍNEA: Lee 4 sensores ópticos TCRT5000 y sigue la línea negra en el piso.
 * 2. MODO SIMULADO FÍSICO: Se mueve por tiempos/delays sin depender de los sensores infrarrojos.
 *    Realiza giros sobre su propio eje (motores opuestos) y avanza recto por tramos de tiempo.
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
// ─── CONFIGURACIÓN DE NAVEGACIÓN ──────────────────────────────────────────────
// true = Se mueve por tiempo en base a la ruta MQTT. No requiere sensores ni línea.
// false = Requiere sensores TCRT5000 y línea negra para avanzar y contar nodos.
const bool SIN_SENSORES_MODO_SIMULADO = true; 
const bool MODO_PRUEBA_OFFLINE = false; 
// ─── CALIBRACIÓN FÍSICA (GIROS Y SENTIDO) ─────────────────────────────────────
const bool INVERTIR_MOTOR_IZQ = false;
const bool INVERTIR_MOTOR_DER = true;
const bool INVERTIR_DIRECCION_GIRO = true;
const float COMPENSACION_MOTOR_IZQ = 1.0; 
const float COMPENSACION_MOTOR_DER = 1.0;
// ─── CONFIGURACIÓN DE SEGUIDOR DE LÍNEA (MODO FÍSICO) ──────────────────────────
const bool MODO_STRADDLE = true; // true si la línea negra va en el medio de los dos sensores frontales
#define ESTADO_NEGRO LOW
#define ESTADO_BLANCO HIGH
// ─── CONFIGURACIÓN DE RED Y MQTT ─────────────────────────────────────────────
const char* ssid = "iPhone de Yuri";     // ⚠️ CAMBIA por tu SSID Wi-Fi
const char* password = "12345678";        // ⚠️ CAMBIA por tu contraseña Wi-Fi
const char* mqtt_broker = "38.250.116.213"; // Broker MQTT del VPS
const int mqtt_port = 1883;
const char* mqtt_user = "yuri";
const char* mqtt_pass = "Montescoli3";
const char* topic_telemetria = "logismart/carro/telemetria";
const char* topic_comando    = "logismart/carro/comando";
const int CARRO_ID = 1;
// ─── MAPEO DE PINES ──────────────────────────────────────────────────────────
#define PIN_LINE_LEFT   32   // Sensor frontal izquierdo (S1)
#define PIN_LINE_RIGHT  18   // Sensor frontal derecho (S2)
#define PIN_NODE_LEFT   34   // Sensor lateral izquierdo (S3)
#define PIN_NODE_RIGHT  35   // Sensor lateral derecho (S4)
#define PIN_MOTOR_IN1   25   // Motor Izquierdo IN1
#define PIN_MOTOR_IN2   14   // Motor Izquierdo IN2
#define PIN_MOTOR_ENA   33   // Motor Izquierdo PWM (ENA)
#define PIN_MOTOR_IN3   21   // Motor Derecho IN3
#define PIN_MOTOR_IN4   19   // Motor Derecho IN4
#define PIN_MOTOR_ENB   23   // Motor Derecho PWM (ENB)
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
bool valLineLeft = false;
bool valLineRight = false;
bool valNodeLeft = false;
bool valNodeRight = false;
int batteryPct = 100;
int baseSpeedForward = 120; // Velocidad base de avance
int speedLeft = 0;
int speedRight = 0;
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 1000;
unsigned long lastNodeDetectionTime = 0;
const unsigned long nodeDebounceInterval = 1000;
unsigned long lastMqttRetry = 0;
// Prototipos
void setupWiFi();
void callback(char* topic, byte* payload, unsigned int length);
void reconnectMQTTNonBlocking();
void publishTelemetry(const char* action = NULL);
void setMotorsSpeed(int speedL, int speedR);
void updateLineFollowing();
void stopMotors();
void parseMoverCommand(JsonDocument& doc);
void processSerialCommands();
void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("     INICIANDO LOGISMART AGV ROBOT v1.8      ");
  Serial.println("=============================================");
  pinMode(PIN_LINE_LEFT, INPUT_PULLUP);
  pinMode(PIN_LINE_RIGHT, INPUT_PULLUP);
  pinMode(PIN_NODE_LEFT, INPUT);
  pinMode(PIN_NODE_RIGHT, INPUT);
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_ENA, OUTPUT);
  pinMode(PIN_MOTOR_IN3, OUTPUT);
  pinMode(PIN_MOTOR_IN4, OUTPUT);
  pinMode(PIN_MOTOR_ENB, OUTPUT);
  stopMotors();
  setupWiFi();
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
  if (MODO_PRUEBA_OFFLINE) {
    currentState = MOVIENDO;
  }
}
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    reconnectMQTTNonBlocking();
    if (client.connected()) {
      client.loop();
    }
  }
  processSerialCommands();
  // Leer sensores (para telemetría básica incluso en modo simulado)
  valLineLeft  = (digitalRead(PIN_LINE_LEFT) == ESTADO_NEGRO);
  valLineRight = (digitalRead(PIN_LINE_RIGHT) == ESTADO_NEGRO);
  valNodeLeft  = (digitalRead(PIN_NODE_LEFT) == ESTADO_NEGRO);
  valNodeRight = (digitalRead(PIN_NODE_RIGHT) == ESTADO_NEGRO);
  
  bool nodeDetected = (valNodeLeft || valNodeRight);
  if (currentState == MOVIENDO || currentState == REGRESANDO) {
    if (SIN_SENSORES_MODO_SIMULADO) {
      Serial.printf("[NAVEGACIÓN] Iniciando recorrido simulado de %d pasos...\n", rutaSize);
      int currentHeading = 0; // 0 = Norte (avenida arriba), 1 = Este (der), 2 = Sur (abajo), 3 = Oeste (izq)
      
      for (int i = 0; i < rutaSize; i++) {
        int nx = ruta[i].x;
        int ny = ruta[i].y;
        
        // Calcular heading de destino basado en coordenadas
        int targetHeading = currentHeading;
        if (nx > posX) targetHeading = 1;      // Este (derecha)
        else if (nx < posX) targetHeading = 3; // Oeste (izquierda)
        else if (ny > posY) targetHeading = 0; // Norte (arriba)
        else if (ny < posY) targetHeading = 2; // Sur (abajo)
        
        // Si hay que cambiar de dirección, girar en su eje
        if (targetHeading != currentHeading) {
          int diff = (targetHeading - currentHeading + 4) % 4;
          Serial.printf("[GIRO] Girando sobre el eje... Actual: %d -> Destino: %d (Diff: %d)\n", currentHeading, targetHeading, diff);
          
          if (diff == 1) {
            // Giro a la derecha en su eje (Izq adelante, Der atrás)
            setMotorsSpeed(130, -130);
            delay(1150); // Ajustar este delay según la fricción del piso para lograr 90 grados
          } else if (diff == 2) {
            // Giro de 180 grados en su eje
            setMotorsSpeed(130, -130);
            delay(2300);
          } else if (diff == 3) {
            // Giro a la izquierda en su eje (Izq atrás, Der adelante)
            setMotorsSpeed(-130, 130);
            delay(1150);
          }
          stopMotors();
          delay(200);
          currentHeading = targetHeading;
        }
        
        // Avanzar al siguiente nodo
        Serial.printf("[AVANCE] Avanzando de (%d,%d) a (%d,%d)...\n", posX, posY, nx, ny);
        setMotorsSpeed(120, 120);
        delay(1800); // Ajustar este delay según la velocidad de tus motores N20 para recorrer 1 celda
        stopMotors();
        delay(200);
        
        // Actualizar estado de coordenadas
        posX = nx;
        posY = ny;
        currentStep = i + 1;
        
        // Disminución de batería simulada
        if (batteryPct > 5) batteryPct--;
        // Publicar avance vía MQTT
        if (posX == destinoX && posY == destinoY) {
          if (currentState == REGRESANDO) {
            currentState = ESPANDO;
            publishTelemetry("confirmar_parada");
            Serial.println("[DESTINO] Regreso a base confirmado.");
          } else {
            currentState = LLEGO;
            publishTelemetry("confirmar_parada");
            Serial.println("[DESTINO] Destino de entrega alcanzado.");
          }
        } else {
          publishTelemetry("avanzar");
        }
        
        // Procesar buffer de red
        client.loop();
        delay(300);
      }
      
      // Terminar el movimiento
      currentState = ESPANDO;
      stopMotors();
    } 
    else {
      // --- MODO FÍSICO CON SEGUIDOR DE LÍNEA ---
      updateLineFollowing();
      if (nodeDetected && (millis() - lastNodeDetectionTime > nodeDebounceInterval)) {
        lastNodeDetectionTime = millis();
        
        if (currentStep < rutaSize) {
          posX = ruta[currentStep].x;
          posY = ruta[currentStep].y;
          currentStep++;
          
          Serial.printf("[NODO] Cruzado físicamente. Posición: (%d, %d)\n", posX, posY);
          
          if (posX == destinoX && posY == destinoY) {
            stopMotors();
            if (currentState == REGRESANDO) {
              currentState = ESPANDO;
              publishTelemetry("confirmar_parada");
            } else {
              currentState = LLEGO;
              publishTelemetry("confirmar_parada");
            }
          } else {
            publishTelemetry("avanzar");
          }
        }
      }
    }
  } 
  else {
    stopMotors();
  }
  // Telemetría periódica cada 1 segundo (solo si está en espera)
  if (currentState == ESPANDO && (millis() - lastTelemetryTime > telemetryInterval)) {
    lastTelemetryTime = millis();
    if (client.connected()) {
      publishTelemetry();
    }
  }
  delay(20);
}
void setMotorsSpeed(int speedL, int speedR) {
  speedL = (int)(speedL * COMPENSACION_MOTOR_IZQ);
  speedR = (int)(speedR * COMPENSACION_MOTOR_DER);
  if (INVERTIR_MOTOR_IZQ) speedL = -speedL;
  if (INVERTIR_MOTOR_DER) speedR = -speedR;
  speedL = constrain(speedL, -255, 255);
  speedR = constrain(speedR, -255, 255);
  // Motor Izquierdo
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
  // Motor Derecho
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
void updateLineFollowing() {
  bool irRecto = false;
  bool girarIzquierda = false;
  bool girarDerecha = false;
  if (MODO_STRADDLE) {
    if (!valLineLeft && !valLineRight) irRecto = true;
    else if (valLineLeft && !valLineRight) girarIzquierda = true;
    else if (!valLineLeft && valLineRight) girarDerecha = true;
    else irRecto = true;
  } 
  else {
    if (valLineLeft && valLineRight) irRecto = true;
    else if (!valLineLeft && valLineRight) girarDerecha = true;
    else if (valLineLeft && !valLineRight) girarIzquierda = true;
    else irRecto = true;
  }
  if (INVERTIR_DIRECCION_GIRO) {
    if (girarIzquierda || girarDerecha) {
      bool temp = girarIzquierda;
      girarIzquierda = girarDerecha;
      girarDerecha = temp;
    }
  }
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
void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.printf("Conectando a Wi-Fi: %s\n", ssid);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n¡Wi-Fi conectado con éxito!");
    Serial.print("IP del carro: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nError: No se pudo conectar a Wi-Fi.");
  }
}
void reconnectMQTTNonBlocking() {
  if (client.connected()) return;
  if (millis() - lastMqttRetry > 5000) {
    lastMqttRetry = millis();
    Serial.println("Intentando conectar al broker MQTT...");
    String clientId = "LogiSmartAGV-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("¡MQTT Conectado!");
      client.subscribe(topic_comando);
    } else {
      Serial.printf("Fallo de conexión MQTT, rc=%d. Reintentando...\n", client.state());
    }
  }
}
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) return;
  int targetCarroId = doc["carro_id"] | 0;
  if (targetCarroId != CARRO_ID) return;
  String action = doc["action"] | "";
  if (action == "mover") {
    parseMoverCommand(doc);
  } 
  else if (action == "stop" || action == "detener") {
    currentState = ESPANDO;
    stopMotors();
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
    currentState = (destinoX == 0 && destinoY == 0) ? REGRESANDO : MOVIENDO;
  }
}
void publishTelemetry(const char* action) {
  JsonDocument doc;
  doc["carro_id"] = CARRO_ID;
  if (action != NULL) doc["action"] = action;
  
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
void processSerialCommands() {
  if (Serial.available() > 0) {
    String inputStr = Serial.readStringUntil('\n');
    inputStr.trim();
    if (inputStr.length() == 0) return;
    
    // Comprobar comandos de una sola letra (para probar desde el Serial Monitor)
    if (inputStr.length() == 1) {
      char cmdChar = inputStr.charAt(0);
      
      if (cmdChar == 'h' || cmdChar == 'H') {
        Serial.println("\n>>> [TECLADO] Comando recibido: RUTA HERRADURA (Destino 2,2)");
        destinoX = 2;
        destinoY = 2;
        rutaSize = 0;
        currentStep = 0;
        
        // Herradura
        ruta[0] = {1, 1};
        ruta[1] = {1, 2};
        ruta[2] = {0, 2}; // Giro
        ruta[3] = {0, 3}; 
        ruta[4] = {1, 3}; // Giro
        ruta[5] = {2, 3}; 
        ruta[6] = {2, 2}; 
        ruta[7] = {1, 2}; // Giro
        ruta[8] = {1, 1};
        ruta[9] = {destinoX, destinoY}; // Destino real final
        rutaSize = 10;
        
        currentState = MOVIENDO;
        Serial.printf("[TEST] Ruta Herradura cargada (%d pasos). ¡Iniciando movimiento!\n", rutaSize);
      }
      else if (cmdChar == 's' || cmdChar == 'S') {
        Serial.println("\n>>> [TECLADO] Comando recibido: RUTA SERPENTEO (Destino 2,3)");
        destinoX = 2;
        destinoY = 3;
        rutaSize = 0;
        currentStep = 0;
        
        // Serpenteo
        ruta[0] = {1, 1};
        ruta[1] = {0, 1}; // Giro
        ruta[2] = {0, 2}; // Giro
        ruta[3] = {1, 2}; // Giro
        ruta[4] = {2, 2}; 
        ruta[5] = {2, 3}; // Giro
        ruta[6] = {1, 3}; // Giro
        ruta[7] = {1, 2};
        ruta[8] = {destinoX, destinoY}; // Destino real final
        rutaSize = 9;
        
        currentState = MOVIENDO;
        Serial.printf("[TEST] Ruta Serpenteo cargada (%d pasos). ¡Iniciando movimiento!\n", rutaSize);
      }
      else if (cmdChar == 'b' || cmdChar == 'B') {
        Serial.println("\n>>> [TECLADO] Comando recibido: RETORNO A BASE");
        destinoX = 1;
        destinoY = 0;
        rutaSize = 0;
        currentStep = 0;
        
        ruta[0] = {1, 0};
        rutaSize = 1;
        
        currentState = REGRESANDO;
        Serial.println("[TEST] ¡Iniciando retorno a base por la avenida!");
      }
      else if (cmdChar == 't' || cmdChar == 'T') {
        currentState = ESPANDO;
        stopMotors();
        Serial.println("\n>>> [TECLADO] Motores DETENIDOS y movimiento abortado.");
      }
      else if (cmdChar == 'p' || cmdChar == 'P') {
        bool rLeft = digitalRead(PIN_LINE_LEFT);
        bool rRight = digitalRead(PIN_LINE_RIGHT);
        bool rNodeL = digitalRead(PIN_NODE_LEFT);
        bool rNodeR = digitalRead(PIN_NODE_RIGHT);
        
        Serial.println("\n=============================================");
        Serial.println("           DIAGNÓSTICO DE SENSORES           ");
        Serial.println("=============================================");
        Serial.printf("S3 (Lateral Izq): %s\n", (rNodeL == ESTADO_NEGRO) ? "NEGRO" : "BLANCO");
        Serial.printf("S1 (Frontal Izq): %s\n", (rLeft == ESTADO_NEGRO) ? "NEGRO" : "BLANCO");
        Serial.printf("S2 (Frontal Der): %s\n", (rRight == ESTADO_NEGRO) ? "NEGRO" : "BLANCO");
        Serial.printf("S4 (Lateral Der): %s\n", (rNodeR == ESTADO_NEGRO) ? "NEGRO" : "BLANCO");
        Serial.println("=============================================");
      }
      return;
    }
    
    // Intentar parsear coordenadas recibidas vía puerto serial ("x,y")
    int commaIndex = inputStr.indexOf(',');
    if (commaIndex > 0) {
      String xStr = inputStr.substring(0, commaIndex);
      String yStr = inputStr.substring(commaIndex + 1);
      
      int targetX = xStr.toInt();
      int targetY = yStr.toInt();
      
      Serial.printf("\n>>> [SERIAL] Coordenadas recibidas por cable: (%d, %d)\n", targetX, targetY);
      
      destinoX = targetX;
      destinoY = targetY;
      
      // Limpiar estado de ruta anterior
      rutaSize = 0;
      currentStep = 0;
      
      // Cargar la ruta predefinida correspondiente en el ESP32
      if (destinoX == 1 && destinoY == 0) {
        // Regreso a base directo
        ruta[0] = {1, 0};
        rutaSize = 1;
        currentState = REGRESANDO;
      }
      else {
        // Si va a una estantería, cargar una de las rutas largas hardcodeadas
        if (destinoY % 2 == 0) {
          // Herradura
          ruta[0] = {1, 1};
          ruta[1] = {1, 2};
          ruta[2] = {0, 2}; // Giro
          ruta[3] = {0, 3}; 
          ruta[4] = {1, 3}; // Giro
          ruta[5] = {2, 3}; 
          ruta[6] = {2, 2}; 
          ruta[7] = {1, 2}; // Giro
          ruta[8] = {1, 1};
          ruta[9] = {destinoX, destinoY}; 
          rutaSize = 10;
        } else {
          // Serpenteo
          ruta[0] = {1, 1};
          ruta[1] = {0, 1}; // Giro
          ruta[2] = {0, 2}; // Giro
          ruta[3] = {1, 2}; // Giro
          ruta[4] = {2, 2}; 
          ruta[5] = {2, 3}; // Giro
          ruta[6] = {1, 3}; // Giro
          ruta[7] = {1, 2};
          ruta[8] = {destinoX, destinoY}; 
          rutaSize = 9;
        }
        currentState = MOVIENDO;
      }
      
      Serial.printf("[RUTA] Cargada ruta de %d pasos. Iniciando ejecución...\n", rutaSize);
      Serial.println("SIM_OK");
    }
  }
}
