/**
 * LogiSmart AGV - Firmware para ESP32 (MQTT Enabled)
 * 
 * Este firmware controla un carro transportador autónomo (AGV) utilizando:
 * - 2 Servomotores de rotación continua (Ruedas izquierda/derecha)
 * - 4 Sensores infrarrojos ópticos (Line Tracking & Intersecciones)
 * - Conexión WiFi y Broker MQTT (Mosquitto) para telemetría y control en tiempo real.
 * 
 * Librerías necesarias en Arduino IDE:
 * - ESP32Servo (para el control de los servomotores)
 * - PubSubClient (para el cliente MQTT)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ==========================================
// 1. CONFIGURACIÓN DE RED Y MQTT
// ==========================================
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* mqtt_server = "38.250.116.213"; // IP del broker Mosquitto en VPS
const int mqtt_port = 1883;
const char* mqtt_user = "yuri";
const char* mqtt_pass = "Montescoli3";

const char* topic_telemetry = "logismart/carro/telemetria";
const char* topic_command = "logismart/carro/comando";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ==========================================
// 2. CONFIGURACIÓN DE HARDWARE (PINS)
// ==========================================
#define MODO_A 1
#define MODO_B 2
#define CONFIG_MODO_SENSORES MODO_B  // Usamos MODO_B por defecto (4 sensores ópticos de línea)

#define PIN_SERVO_IZQ    18
#define PIN_SERVO_DER    19

#define PIN_SEN_L_OUTER        34  // Sensor Izquierdo Exterior (Cruces/Nodos)
#define PIN_SEN_L_INNER        32  // Sensor Izquierdo Interior (Alineación)
#define PIN_SEN_R_INNER        33  // Sensor Derecho Interior (Alineación)
#define PIN_SEN_R_OUTER        35  // Sensor Derecho Exterior (Cruces/Nodos)

#define PIN_SEN_OBSTACLE_FRONT 26  // Sensor de Obstáculo Frontal
#define PIN_SEN_OBSTACLE_BACK  27  // Sensor de Obstáculo Trasero

#define PIN_BUZZER       25  // Zumbador piezoeléctrico para alertas
#define PIN_LED_STATUS   2   // LED integrado del ESP32

// Configuración de umbral óptico
#define SENSORS_ARE_ANALOG true
#define UMBRAL_LINEA       2000  // Valor analógico de corte
#define ESTADO_LÍNEA       HIGH  // HIGH si el sensor lee 1 en negro

// Configuración de Sensores de Proximidad de Obstáculos
#define OBSTACLE_ACTIVE_STATE LOW   // LOW si el sensor se activa en BAJO

// ==========================================
// 3. VELOCIDADES Y CALIBRACIÓN DE SERVOS
// ==========================================
#define SERVO_STOP_US    1500
#define VEL_AVANCE_IZQ   1600   // Hacia adelante
#define VEL_AVANCE_DER   1400   // Sentido opuesto físicamente
#define VEL_GIRO_IZQ     1400   
#define VEL_GIRO_DER     1400   

// ==========================================
// 4. ESTADOS Y VARIABLES DE NAVEGACIÓN
// ==========================================
enum State {
  STATE_ESPERANDO,   // Esperando comandos
  STATE_SIGUIENDO,   // Avanzando en línea recta
  STATE_GIRANDO_IZQ, // Giro de 90° a la izquierda
  STATE_GIRANDO_DER, // Giro de 90° a la derecha
  STATE_GIRO_180,    // Giro de 180°
  STATE_OBSTACULO,   // Detenido por obstáculo
  STATE_LLEGO        // Llegó a parada
};

enum Heading {
  NORTH = 0, // Y+
  EAST  = 1, // X+
  SOUTH = 2, // Y-
  WEST  = 3  // X-
};

State estadoActual = STATE_ESPERANDO;
Heading orientacionActual = EAST; 

int posX = 0;
int posY = 0;
int destX = 0;
int destY = 0;

// Estructuras locales de ruta
int rutaX[50];
int rutaY[50];
int rutaLength = 0;
int indexRuta = 0;

int proximoX = 0;
int proximoY = 0;
bool tieneSiguienteNodo = false;

Servo servoIzq;
Servo servoDer;

// Velocidades de motores guardadas para telemetría
int currentVelIzq = SERVO_STOP_US;
int currentVelDer = SERVO_STOP_US;

State estadoPrevio = STATE_ESPERANDO;
unsigned long obstaculoDespejadoTiempo = 0;
unsigned long ultimoReporteTelemetria = 0;

// Variables de sensores para telemetría
bool sOpt1 = false;
bool sOpt2 = false;
bool sOpt3 = false;
bool sOpt4 = false;
bool obsFront = false;
bool obsBack = false;

// ==========================================
// 5. FUNCIONES DE LECTURA DE SENSORES
// ==========================================
bool leeSensor(int pin) {
  if (pin == -1) return false;
  if (SENSORS_ARE_ANALOG) {
    return analogRead(pin) > UMBRAL_LINEA;
  } else {
    return digitalRead(pin) == ESTADO_LÍNEA;
  }
}

bool leeSensorObstaculo(int pin) {
  if (pin == -1) return false;
  return digitalRead(pin) == OBSTACLE_ACTIVE_STATE;
}

void actualizarLecturaSensores() {
  sOpt1 = leeSensor(PIN_SEN_L_OUTER);
  sOpt2 = leeSensor(PIN_SEN_L_INNER);
  sOpt3 = leeSensor(PIN_SEN_R_INNER);
  sOpt4 = leeSensor(PIN_SEN_R_OUTER);
  
  obsFront = leeSensorObstaculo(PIN_SEN_OBSTACLE_FRONT);
  obsBack  = leeSensorObstaculo(PIN_SEN_OBSTACLE_BACK);
}

void verificarObstaculos() {
  bool obstaculoDelante = obsFront;
  bool obstaculoDetras  = obsBack;

  bool obstaculoDetectado = false;
  if (estadoActual == STATE_SIGUIENDO || estadoActual == STATE_GIRANDO_IZQ || 
      estadoActual == STATE_GIRANDO_DER || estadoActual == STATE_GIRO_180) {
    if (obstaculoDelante) {
      obstaculoDetectado = true;
    }
  }

  if (estadoActual != STATE_OBSTACULO) {
    if (obstaculoDetectado) {
      estadoPrevio = estadoActual;
      estadoActual = STATE_OBSTACULO;
      pararMotores();
      sonarBip(450);
      Serial.println("[SEGURIDAD] ¡OBSTÁCULO DETECTADO! Motores detenidos.");
      enviarTelemetriaMQTT(false); // Forzar reporte inmediato
    }
  } else {
    if (!obstaculoDelante && !obstaculoDetras) {
      if (obstaculoDespejadoTiempo == 0) {
        obstaculoDespejadoTiempo = millis();
      } else if (millis() - obstaculoDespejadoTiempo > 1500) { // Debounce de 1.5s
        estadoActual = estadoPrevio;
        obstaculoDespejadoTiempo = 0;
        Serial.println("[SEGURIDAD] Obstáculo despejado. Reanudando.");
        sonarBip(100);
        delay(50);
        sonarBip(100);
        enviarTelemetriaMQTT(false); // Forzar reporte inmediato
      }
    } else {
      obstaculoDespejadoTiempo = 0;
    }
  }
}

// ==========================================
// 6. FUNCIONES DE MOVIMIENTO DE MOTORES
// ==========================================
void pararMotores() {
  currentVelIzq = SERVO_STOP_US;
  currentVelDer = SERVO_STOP_US;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

void avanzarRecto() {
  currentVelIzq = VEL_AVANCE_IZQ;
  currentVelDer = VEL_AVANCE_DER;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

void corregirDerecha() {
  currentVelIzq = VEL_AVANCE_IZQ + 50;
  currentVelDer = SERVO_STOP_US;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

void corregirIzquierda() {
  currentVelIzq = SERVO_STOP_US;
  currentVelDer = VEL_AVANCE_DER - 50;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

void girarIzqEje() {
  currentVelIzq = 1300;
  currentVelDer = 1300;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

void girarDerEje() {
  currentVelIzq = 1700;
  currentVelDer = 1700;
  servoIzq.writeMicroseconds(currentVelIzq);
  servoDer.writeMicroseconds(currentVelDer);
}

// ==========================================
// 7. ARRANQUE Y CONFIGURACIÓN (SETUP)
// ==========================================
void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_SEN_L_OUTER, INPUT);
  pinMode(PIN_SEN_L_INNER, INPUT);
  pinMode(PIN_SEN_R_INNER, INPUT);
  pinMode(PIN_SEN_R_OUTER, INPUT);
  
  pinMode(PIN_SEN_OBSTACLE_FRONT, INPUT);
  pinMode(PIN_SEN_OBSTACLE_BACK, INPUT);
  
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  servoIzq.attach(PIN_SERVO_IZQ);
  servoDer.attach(PIN_SERVO_DER);
  pararMotores();

  digitalWrite(PIN_LED_STATUS, LOW);
  sonarBip(200);

  // Conectar WiFi
  conectarWiFi();

  // Configurar MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
}

void conectarWiFi() {
  Serial.println("\nConectando a WiFi...");
  WiFi.begin(ssid, password);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n¡Conectado a WiFi!");
    digitalWrite(PIN_LED_STATUS, HIGH);
    sonarBip(100);
    delay(50);
    sonarBip(100);
  } else {
    Serial.println("\nError de conexión WiFi. Operando offline.");
    digitalWrite(PIN_LED_STATUS, LOW);
  }
}

// ==========================================
// 8. COMUNICACIÓN MQTT
// ==========================================
void conectarMQTT() {
  while (!mqttClient.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
      conectarWiFi();
    }
    Serial.print("Conectando al Broker MQTT...");
    // ID único del cliente
    String clientID = "ESP32_AGV_" + String(random(0, 1000));
    if (mqttClient.connect(clientID.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("¡Conectado!");
      mqttClient.subscribe(topic_command);
      Serial.printf("Suscrito a: %s\n", topic_command);
      sonarBip(150);
    } else {
      Serial.print("Falló con estado: ");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5s...");
      delay(5000);
    }
  }
}

const char* getEstadoString(State state) {
  switch (state) {
    case STATE_ESPERANDO:   return "esperando";
    case STATE_SIGUIENDO:   return "moviendo";
    case STATE_GIRANDO_IZQ: return "moviendo";
    case STATE_GIRANDO_DER: return "moviendo";
    case STATE_GIRO_180:    return "moviendo";
    case STATE_OBSTACULO:   return "moviendo"; // se mantiene como ruta activa
    case STATE_LLEGO:       return "llego";
    default:                return "esperando";
  }
}

void enviarTelemetriaMQTT(bool timerCheck) {
  if (timerCheck && (millis() - ultimoReporteTelemetria < 200)) {
    return; // limite de tasa (max 5Hz en loop ordinario)
  }
  ultimoReporteTelemetria = millis();

  if (!mqttClient.connected()) return;

  char payload[350];
  snprintf(payload, sizeof(payload),
    "{\"sensor_opt_izq_ext\":%s,\"sensor_opt_izq_int\":%s,\"sensor_opt_der_int\":%s,\"sensor_opt_der_ext\":%s,"
    "\"sensor_obstaculo_frontal\":%s,\"sensor_obstaculo_trasero\":%s,\"motor_izq_vel\":%d,\"motor_der_vel\":%d,"
    "\"pos_x\":%d,\"pos_y\":%d,\"estado\":\"%s\"}",
    sOpt1 ? "true" : "false", sOpt2 ? "true" : "false", sOpt3 ? "true" : "false", sOpt4 ? "true" : "false",
    obsFront ? "true" : "false", obsBack ? "true" : "false", currentVelIzq, currentVelDer,
    posX, posY, getEstadoString(estadoActual)
  );

  mqttClient.publish(topic_telemetry, payload);
}

void notificarAccionMQTT(const char* actionName) {
  if (!mqttClient.connected()) return;
  char payload[100];
  snprintf(payload, sizeof(payload), "{\"action\":\"%s\"}", actionName);
  mqttClient.publish(topic_telemetry, payload);
}

// Callback de comandos recibidos
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("Comando MQTT recibido en %s: %s\n", topic, message.c_str());

  // Parsear comandos simples
  if (message.indexOf("\"action\":\"reset\"") != -1) {
    Serial.println("Comando: Reset");
    pararMotores();
    posX = 0; posY = 0;
    destX = 0; destY = 0;
    rutaLength = 0;
    indexRuta = 0;
    tieneSiguienteNodo = false;
    estadoActual = STATE_ESPERANDO;
    sonarBip(200);
    enviarTelemetriaMQTT(false);
  }
  else if (message.indexOf("\"action\":\"stop\"") != -1) {
    Serial.println("Comando: Stop");
    pararMotores();
    tieneSiguienteNodo = false;
    estadoActual = STATE_ESPERANDO;
    sonarBip(200);
    enviarTelemetriaMQTT(false);
  }
  else if (message.indexOf("\"action\":\"mover\"") != -1) {
    // Parsear destino X e Y
    int destXIdx = message.indexOf("\"destino_x\":");
    int destYIdx = message.indexOf("\"destino_y\":");
    if (destXIdx != -1 && destYIdx != -1) {
      int commaX = message.indexOf(",", destXIdx);
      int closeBraceY = message.indexOf("}", destYIdx);
      if (closeBraceY == -1) closeBraceY = message.indexOf(",", destYIdx);
      
      destX = message.substring(destXIdx + 12, commaX).toInt();
      destY = message.substring(destYIdx + 12, closeBraceY).toInt();
    }

    // Parsear array de ruta: "ruta":[{"x":X,"y":Y}]
    rutaLength = 0;
    int idx = message.indexOf("\"ruta\":[");
    if (idx != -1) {
      idx += 8;
      while (true) {
        int xIdx = message.indexOf("\"x\":", idx);
        if (xIdx == -1) break;
        int commaIdx = message.indexOf(",", xIdx);
        int yIdx = message.indexOf("\"y\":", commaIdx);
        int braceIdx = message.indexOf("}", yIdx);
        
        int xVal = message.substring(xIdx + 4, commaIdx).toInt();
        int yVal = message.substring(yIdx + 4, braceIdx).toInt();
        
        if (rutaLength < 50) {
          rutaX[rutaLength] = xVal;
          rutaY[rutaLength] = yVal;
          rutaLength++;
        }
        idx = braceIdx;
      }
    }

    indexRuta = 0;
    if (rutaLength > 0) {
      proximoX = rutaX[0];
      proximoY = rutaY[0];
      tieneSiguienteNodo = true;
      estadoActual = STATE_SIGUIENDO;
      Serial.printf("Nueva ruta MQTT: %d nodos. Destino: (%d, %d). Proximo: (%d, %d)\n", 
                    rutaLength, destX, destY, proximoX, proximoY);
      sonarBip(100);
      planificarSiguientePaso();
    } else {
      tieneSiguienteNodo = false;
      estadoActual = STATE_ESPERANDO;
    }
    enviarTelemetriaMQTT(false);
  }
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

  int giro = (direccionRequerida - orientacionActual + 4) % 4;

  if (giro == 0) {
    estadoActual = STATE_SIGUIENDO;
  } else if (giro == 1) {
    estadoActual = STATE_GIRANDO_DER;
    iniciarGiro(true);
  } else if (giro == 3) {
    estadoActual = STATE_GIRANDO_IZQ;
    iniciarGiro(false);
  } else if (giro == 2) {
    estadoActual = STATE_GIRO_180;
    iniciarGiro180();
  }

  orientacionActual = direccionRequerida;
}

void iniciarGiro(bool derecha) {
  sonarBip(80);
  avanzarRecto();
  delay(250);
  
  if (derecha) {
    girarDerEje();
  } else {
    girarIzqEje();
  }
  
  delay(300); 
  
  unsigned long timeout = millis();
  while (millis() - timeout < 2500) {
    actualizarLecturaSensores();
    if (sOpt2 || sOpt3) {
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

  girarDerEje();
  delay(600);

  unsigned long timeout = millis();
  while (millis() - timeout < 3500) {
    actualizarLecturaSensores();
    if (sOpt2 || sOpt3) {
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
  // Asegurar conexión a MQTT
  if (!mqttClient.connected()) {
    conectarMQTT();
  }
  mqttClient.loop();

  // Actualizar lecturas y verificar obstáculos
  actualizarLecturaSensores();
  verificarObstaculos();

  if (estadoActual == STATE_OBSTACULO) {
    static unsigned long ultimoPitido = 0;
    if (millis() - ultimoPitido > 750) {
      ultimoPitido = millis();
      sonarBip(120);
      Serial.println("[OBSTÁCULO] Carro bloqueado en ruta.");
      enviarTelemetriaMQTT(false);
    }
    delay(40);
    return;
  }

  if (estadoActual == STATE_LLEGO) {
    // Simular parada física de entrega
    static unsigned long tiempoLlegada = 0;
    if (tiempoLlegada == 0) {
      tiempoLlegada = millis();
      pararMotores();
      sonarBip(500);
      Serial.println("Llegamos a parada. Iniciando descarga...");
      enviarTelemetriaMQTT(false);
    }
    
    if (millis() - tiempoLlegada > 5000) { // Esperar 5 segundos
      Serial.println("Descarga completada. Solicitando confirmación de parada...");
      notificarAccionMQTT("confirmar_parada");
      tiempoLlegada = 0;
      estadoActual = STATE_ESPERANDO; // El worker enviará la siguiente ruta
    }
    delay(100);
    return;
  }

  if (estadoActual == STATE_SIGUIENDO) {
    // Detección de intersección: ambos sensores externos pisan negro
    if (sOpt1 && sOpt4) {
      pararMotores();
      posX = proximoX;
      posY = proximoY;
      Serial.printf("Llegamos al nodo (%d, %d)\n", posX, posY);
      
      // Notificar al Django worker que avanzamos un nodo
      notificarAccionMQTT("avanzar");
      
      indexRuta++;
      if (indexRuta < rutaLength) {
        proximoX = rutaX[indexRuta];
        proximoY = rutaY[indexRuta];
        tieneSiguienteNodo = true;
        planificarSiguientePaso();
      } else {
        tieneSiguienteNodo = false;
        estadoActual = STATE_LLEGO; // llegó a destino final de esta ruta
      }
      enviarTelemetriaMQTT(false); // Reporte inmediato
    }
    else {
      // Algoritmo de alineación a la línea
      if (sOpt2 && sOpt3) {
        avanzarRecto();
      } 
      else if (sOpt2 && !sOpt3) {
        corregirIzquierda();
      } 
      else if (!sOpt2 && sOpt3) {
        corregirDerecha();
      }
      else {
        // Pérdida temporal
        servoIzq.writeMicroseconds(VEL_AVANCE_IZQ - 30);
        servoDer.writeMicroseconds(VEL_AVANCE_DER + 30);
      }
    }
  }

  // Reportar telemetría en tiempo real
  enviarTelemetriaMQTT(true);
  delay(20);
}

void sonarBip(int duracionMs) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(duracionMs);
  digitalWrite(PIN_BUZZER, LOW);
}
