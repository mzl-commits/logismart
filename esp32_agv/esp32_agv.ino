#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
// ==========================================
// 1. CREDENCIALES DE RED Y SERVIDOR VPS
// ==========================================
const char* ssid = "iPhone de yuri";                     // <-- Wi-Fi local
const char* password = "12345678";             // <-- Clave Wi-Fi local
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
const int senFrontalIzq = 32; // S1 (Seguidor de línea izquierdo)
const int senFrontalDer = 18; // S2 (Seguidor de línea derecho)
const int senLateralDer = 35; // S4 (Detección de Nodos / Intersecciones)
// Motor Izquierdo (M1)
const int enA = 33; 
const int in1 = 25; 
const int in2 = 14; 
// Motor Derecho (M2)
const int enB = 23; 
const int in3 = 21; 
const int in4 = 19; 
// ==========================================
// 3. ESTRUCTURAS Y VARIABLES DE NAVEGACIÓN
// ==========================================
enum Heading { NORTH = 0, EAST = 1, SOUTH = 2, WEST = 3 };
Heading orientacionActual = NORTH; // Comienza mirando al Norte (Y+)
struct Nodo {
  int x;
  int y;
};
Nodo ruta[100];
int ruta_len = 0;
int ruta_idx = 0;
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
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH); // M1 adelante
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH); // M2 adelante
}
void girarDerecha(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH); // M1 adelante
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW); // M2 atrás
}
void girarIzquierda(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  digitalWrite(in1, HIGH);  digitalWrite(in2, LOW); // M1 atrás
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);  // M2 adelante
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
  // Reportar sensores lógicos
  doc["sensor_opt_izq_ext"] = false;
  doc["sensor_opt_izq_int"] = (digitalRead(senFrontalIzq) == HIGH);
  doc["sensor_opt_der_int"] = (digitalRead(senFrontalDer) == HIGH);
  doc["sensor_opt_der_ext"] = (digitalRead(senLateralDer) == HIGH);
  doc["sensor_obstaculo_frontal"] = false;
  doc["sensor_obstaculo_trasero"] = false;
  
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
// 6. LÓGICA AUTÓNOMA DE PLANIFICACIÓN Y GIRO
// ==========================================
void iniciarGiro(bool derecha) {
  Serial.println(derecha ? "Ejecutando giro 90° a la DERECHA..." : "Ejecutando giro 90° a la IZQUIERDA...");
  
  // 1. Avanzar un poco para alinear el eje de rotación con la intersección
  avanzar(110);
  delay(250); 
  frenar();
  delay(100);
  // 2. Comenzar a rotar en el propio eje
  if (derecha) {
    girarDerecha(135);
  } else {
    girarIzquierda(135);
  }
  
  // 3. Esperar un momento breve para salir de la línea negra actual
  delay(400); 
  // 4. Seguir rotando hasta encontrar de nuevo la línea negra
  unsigned long start = millis();
  while (millis() - start < 3000) { // Timeout de seguridad
    int s1 = digitalRead(senFrontalIzq);
    int s2 = digitalRead(senFrontalDer);
    if (s1 == HIGH || s2 == HIGH) {
      break; // Línea encontrada
    }
    delay(10);
  }
  
  frenar();
  delay(100);
}
void iniciarGiro180() {
  Serial.println("Ejecutando giro de 180° (Retorno/Entrega)...");
  
  // Rotar a la derecha en el eje
  girarDerecha(135);
  delay(800); // Salir de la línea actual
  
  unsigned long start = millis();
  while (millis() - start < 4000) { // Timeout de seguridad
    int s1 = digitalRead(senFrontalIzq);
    int s2 = digitalRead(senFrontalDer);
    if (s1 == HIGH || s2 == HIGH) {
      break; // Línea opuesta encontrada
    }
    delay(10);
  }
  
  frenar();
  delay(100);
}
void planificarSiguientePaso() {
  if (ruta_idx >= ruta_len) {
    // Llegamos al destino final de la ruta
    frenar();
    estado_actual = "llego";
    robotActivo = false;
    Serial.println("▶ ¡Destino alcanzado! Deteniendo motores.");
    
    // Al entregar o llegar al final, dar la vuelta de 180 grados para quedar listo para salir
    iniciarGiro180();
    
    // Invertir orientación física actual tras girar 180°
    orientacionActual = (Heading)((orientacionActual + 2) % 4);
    
    publicarTelemetria();
    return;
  }
  // Determinar dirección requerida para ir al siguiente nodo de la ruta
  int next_x = ruta[ruta_idx].x;
  int next_y = ruta[ruta_idx].y;
  Heading direccionRequerida = orientacionActual;
  if (next_x > pos_x) {
    direccionRequerida = EAST;
  } else if (next_x < pos_x) {
    direccionRequerida = WEST;
  } else if (next_y > pos_y) {
    direccionRequerida = NORTH;
  } else if (next_y < pos_y) {
    direccionRequerida = SOUTH;
  }
  // Calcular la diferencia de orientación (0: recto, 1: der, 2: 180°, 3: izq)
  int giro = (direccionRequerida - orientacionActual + 4) % 4;
  if (giro == 0) {
    Serial.printf("Trayecto recto hacia (%d, %d). Avanzando...\n", next_x, next_y);
  } 
  else if (giro == 1) {
    iniciarGiro(true); // Giro 90° Derecha
  } 
  else if (giro == 3) {
    iniciarGiro(false); // Giro 90° Izquierda
  } 
  else if (giro == 2) {
    iniciarGiro180(); // Giro 180°
  }
  orientacionActual = direccionRequerida;
}
// ==========================================
// 7. FUNCIONES DE RED (Wi-Fi y MQTT)
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
  StaticJsonDocument<1024> doc;
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
    
    // Cargar la ruta de coordenadas paso a paso
    JsonArray routeArr = doc["ruta"];
    ruta_len = 0;
    for (JsonObject nodeObj : routeArr) {
      if (ruta_len < 100) {
        ruta[ruta_len].x = nodeObj["x"];
        ruta[ruta_len].y = nodeObj["y"];
        ruta_len++;
      }
    }
    
    ruta_idx = 0;
    robotActivo = true;
    estado_actual = "moviendo";
    Serial.printf("▶ Iniciando ruta hacia X: %d, Y: %d (%d nodos cargados)\n", destino_x, destino_y, ruta_len);
    
    // Planificar y ejecutar el primer paso del trayecto
    planificarSiguientePaso();
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
    ruta_len = 0;
    ruta_idx = 0;
    orientacionActual = NORTH;
    estado_actual = "esperando";
    Serial.println("▶ Carro reiniciado a coordenadas (0,0) mirando al Norte.");
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
// 8. INICIALIZACIÓN
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
// 9. BUCLE PRINCIPAL (LOOP)
// ==========================================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  unsigned long now = millis();
  
  // --- TELEMETRÍA PERIÓDICA (Cada 2 segundos) ---
  if (now - lastMsg > 2000) {
    lastMsg = now;
    
    if (robotActivo && estado_actual == "moviendo") {
      bateria_pct = max(0, bateria_pct - 1);
    }
    publicarTelemetria();
  }
  // --- CONTROL DE NAVEGACIÓN EN RUTA ---
  if (robotActivo) {
    int valS1 = digitalRead(senFrontalIzq);
    int valS2 = digitalRead(senFrontalDer);
    int valS4 = digitalRead(senLateralDer);
    // Detección de intersección o marca de nodo
    if (valS4 == 0) { 
      frenar();
      
      // Llegamos físicamente al siguiente nodo de la ruta
      pos_x = ruta[ruta_idx].x;
      pos_y = ruta[ruta_idx].y;
      Serial.printf("Nodo cruzado. Posición actual: (%d, %d)\n", pos_x, pos_y);
      // 1. Reportar el avance al servidor Django
      publicarAvanzar();
      
      // 2. Incrementar índice de nodo en la ruta local
      ruta_idx++;
      
      // 3. Planificar y ejecutar el giro o avance para el siguiente tramo
      planificarSiguientePaso();
      
      // 4. Si aún no termina la ruta, avanzar un poco para despejar la intersección física
      if (robotActivo) {
        avanzar(110);
        delay(400); 
      }
    }
    else {
      // Seguidor de línea clásico con sensores frontales (S1 y S2)
      if (valS1 == HIGH && valS2 == HIGH) {
        avanzar(110); // Seguir recto sobre la línea
      }
      else if (valS1 == LOW && valS2 == HIGH) {
        girarIzquierda(125); // Corregir a la izquierda
      }
      else if (valS1 == HIGH && valS2 == LOW) {
        girarDerecha(125); // Corregir a la derecha
      }
      else if (valS1 == LOW && valS2 == LOW) {
        avanzar(100); // Pérdida temporal, avanza despacio
      }
    }
  }
}