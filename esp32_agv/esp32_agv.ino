#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// 1. CREDENCIALES DE RED Y SERVIDOR VPS
// ==========================================
const char* ssid = "iPhone de Yuri";           // <-- REEMPLAZA CON TU WIFI si es necesario
const char* password = "12345678";             // <-- REEMPLAZA CON TU CLAVE

const char* mqtt_server = "38.250.116.213";
const int mqtt_port = 1883;
const char* mqtt_user = "yuri";
const char* mqtt_pass = "Montescoli3";

const char* topic_telemetria = "logismart/carro/telemetria";
const char* topic_comando = "logismart/carro/comando";

// ID del carro esperado por Django en EstadoCarro
const int carro_id = 1; 

WiFiClient espClient;
PubSubClient client(espClient);

// ==========================================
// 2. MAPEO DE PINES EXACTO (L293D y Sensores)
// ==========================================
const int senFrontalIzq = 32; // S1
const int senFrontalDer = 18; // S2
const int senLateralDer = 35; // S4 (Nodos)

// Motor Izquierdo (M1)
const int enA = 33; 
const int in1 = 25; 
const int in2 = 14; 

// Motor Derecho (M2)
const int enB = 23; 
const int in3 = 21; 
const int in4 = 19; 

// ==========================================
// 3. VARIABLES DE ESTADO Y CONTROL
// ==========================================
int pos_x = 0;
int pos_y = 0;
int destino_x = 0;
int destino_y = 0;
int bateria_pct = 100;
String estado_actual = "esperando"; // "esperando", "moviendo", "llego", "regresando"

unsigned long lastMsg = 0;
bool robotActivo = false; 

// ==========================================
// 4. FUNCIONES DE MOVIMIENTO (Hardware Validado)
// ==========================================
void avanzar(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH); 
}

void girarDerecha(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW); 
}

void girarIzquierda(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  digitalWrite(in1, HIGH);  digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH); 
}

void frenar() {
  analogWrite(enA, 0); analogWrite(enB, 0);
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
}

// ==========================================
// 5. ENVÍO DE MENSAJES MQTT (Telemetría y Eventos)
// ==========================================
void publicarTelemetria() {
  StaticJsonDocument<512> doc;
  doc["carro_id"] = carro_id;
  doc["bateria_pct"] = bateria_pct;
  doc["pos_x"] = pos_x;
  doc["pos_y"] = pos_y;
  doc["destino_x"] = destino_x;
  doc["destino_y"] = destino_y;
  doc["estado"] = estado_actual;

  // Leer estado de sensores físicos reales
  doc["sensor_opt_izq_ext"] = false;
  doc["sensor_opt_izq_int"] = (digitalRead(senFrontalIzq) == HIGH);
  doc["sensor_opt_der_int"] = (digitalRead(senFrontalDer) == HIGH);
  doc["sensor_opt_der_ext"] = (digitalRead(senLateralDer) == HIGH);
  doc["sensor_obstaculo_frontal"] = false;
  doc["sensor_obstaculo_trasero"] = false;
  
  // Velocidades de motores reportadas
  doc["motor_izq_vel"] = robotActivo ? 110 : 0;
  doc["motor_der_vel"] = robotActivo ? 110 : 0;

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);
  
  client.publish(topic_telemetria, jsonBuffer);
  Serial.print("[Telemetría] ");
  Serial.println(jsonBuffer);
}

void publicarAvanzar() {
  StaticJsonDocument<128> doc;
  doc["action"] = "avanzar";
  doc["carro_id"] = carro_id;
  
  char jsonBuffer[128];
  serializeJson(doc, jsonBuffer);
  client.publish(topic_telemetria, jsonBuffer);
  Serial.print("[Evento] Nodo cruzado reportado al servidor: ");
  Serial.println(jsonBuffer);
}

// ==========================================
// 6. FUNCIONES DE RED (Wi-Fi y MQTT)
// ==========================================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado exitosamente");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("\n[Comando Recibido] ");
  
  String msg = "";
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.println(msg);

  // Parsear el comando JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, msg);

  if (error) {
    Serial.print("Error al parsear JSON: ");
    Serial.println(error.c_str());
    return;
  }

  // Validar si el comando es para este carro
  int cid = doc["carro_id"];
  if (cid != 0 && cid != carro_id) {
    Serial.println("Comando ignorado (para otro carro).");
    return;
  }

  String action = doc["action"].as<String>();

  if (action == "mover") {
    destino_x = doc["destino_x"];
    destino_y = doc["destino_y"];
    robotActivo = true;
    estado_actual = "moviendo";
    Serial.printf("▶ Iniciando ruta hacia X: %d, Y: %d\n", destino_x, destino_y);
  } 
  else if (action == "stop" || action == "detener") {
    frenar();
    robotActivo = false;
    estado_actual = "esperando";
    Serial.println("▶ Carro detenido remotamente.");
  }
  else if (action == "reset") {
    frenar();
    robotActivo = false;
    pos_x = 0;
    pos_y = 0;
    destino_x = 0;
    destino_y = 0;
    estado_actual = "esperando";
    Serial.println("▶ Carro reiniciado a coordenadas (0,0).");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT... ");
    String clientId = "AGV_ESP32_" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("¡Conectado!");
      client.subscribe(topic_comando);
    } else {
      Serial.print("Falló, rc=");
      Serial.print(client.state());
      Serial.println(". Reintentando en 5 segundos...");
      delay(5000);
    }
  }
}

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================
void setup() {
  Serial.begin(115200);
  randomSeed(micros());
  
  pinMode(senFrontalIzq, INPUT);
  pinMode(senFrontalDer, INPUT);
  pinMode(senLateralDer, INPUT);
  
  pinMode(enA, OUTPUT); pinMode(in1, OUTPUT); pinMode(in2, OUTPUT);
  pinMode(enB, OUTPUT); pinMode(in3, OUTPUT); pinMode(in4, OUTPUT);
  
  frenar(); 

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ==========================================
// 8. CEREBRO PRINCIPAL (Loop)
// ==========================================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  
  // --- TELEMETRÍA (Cada 2 segundos) ---
  if (now - lastMsg > 2000) {
    lastMsg = now;
    
    if (robotActivo && estado_actual == "moviendo") {
      bateria_pct = max(0, bateria_pct - 1);
    }
    publicarTelemetria();
  }

  // --- NAVEGACIÓN Y HARDWARE ---
  if (robotActivo) {
    int valS1 = digitalRead(senFrontalIzq);
    int valS2 = digitalRead(senFrontalDer);
    int valS4 = digitalRead(senLateralDer);

    if (valS4 == 0) { 
      // Hemos cruzado un marcador lateral (Nodo)
      frenar();
      
      // 1. Reportar el evento de nodo al servidor Django para actualizar coordenadas
      publicarAvanzar();
      
      // 2. Avanzar un poco para cruzar la línea física del nodo y no ciclarse
      avanzar(150); 
      delay(400); 
    }
    else {
      // Seguidor de línea clásico con S1 y S2
      if (valS1 == 1 && valS2 == 1) avanzar(110);
      else if (valS1 == 0 && valS2 == 1) girarIzquierda(130);
      else if (valS1 == 1 && valS2 == 0) girarDerecha(130);
      else if (valS1 == 0 && valS2 == 0) avanzar(110);
    }
  }
}