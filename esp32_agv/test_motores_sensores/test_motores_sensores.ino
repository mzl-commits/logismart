/**
 * LogiSmart AGV - Sketch de Prueba Integrada (Seguidor de Línea Offline v2.0)
 * 
 * Este sketch prueba los motores y los sensores ópticos de forma integrada ("de la mano").
 * El robot funcionará como un seguidor de línea autónomo inmediato al encenderse (sin WiFi ni MQTT).
 * 
 * Velocidad del Monitor Serial: 9600 baudios.
 */

// ─── CONFIGURACIÓN DE PINES ──────────────────────────────────────────────────
// Sensores Ópticos de Suelo
#define PIN_LINE_LEFT   32   // S1 (Frontal Interno Izquierdo)
#define PIN_LINE_RIGHT  18   // S2 (Frontal Interno Derecho)
#define PIN_NODE_LEFT   34   // S3 (Lateral Externo Izquierdo)
#define PIN_NODE_RIGHT  35   // S4 (Lateral Externo Derecho)

// Puente H Motores N20
#define PIN_MOTOR_IN1   25   // Motor Izquierdo IN1
#define PIN_MOTOR_IN2   14   // Motor Izquierdo IN2
#define PIN_MOTOR_ENA   33   // Motor Izquierdo ENA (PWM)
#define PIN_MOTOR_IN3   21   // Motor Derecho IN3
#define PIN_MOTOR_IN4   19   // Motor Derecho IN4
#define PIN_MOTOR_ENB   23   // Motor Derecho ENB (PWM)

// ─── CONFIGURACIÓN DE CALIBRACIÓN (RESTAURADA A 1.0) ──────────────────────────
const float COMPENSACION_MOTOR_IZQ = 1.0; 
const float COMPENSACION_MOTOR_DER = 1.0;

const bool INVERTIR_MOTOR_IZQ = false;
const bool INVERTIR_MOTOR_DER = false;
const bool INVERTIR_DIRECCION_GIRO = true; // Por defecto true tras invertir direcciones

// La línea negra va en el medio de los sensores (true) o debajo (false)
const bool MODO_STRADDLE = true; 

// Polaridad del sensor: HIGH en negro, LOW en blanco
#define ESTADO_NEGRO HIGH
#define ESTADO_BLANCO LOW

// Velocidad base (0 a 255)
int baseSpeedForward = 120;

// Variables globales del test
int nodeCount = 0;
unsigned long lastNodeDetectionTime = 0;
const unsigned long nodeDebounceInterval = 1000;
unsigned long lastSensorPrint = 0;
int speedLeft = 0;
int speedRight = 0;

void setup() {
  Serial.begin(9600);
  delay(1500);
  Serial.println("\n=============================================");
  Serial.println("  TEST INTEGRADO: SENSORES DE LA MANO CON MOTORES ");
  Serial.println("=============================================");
  Serial.println("El carro intentará seguir la línea negra de forma autónoma.");
  Serial.println("Configura tu Monitor Serial a 9600 baudios.");
  Serial.println("=============================================");

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

  setMotors(0, 0);
}

void loop() {
  // 1. Leer Sensores
  bool valLineLeft  = (digitalRead(PIN_LINE_LEFT) == ESTADO_NEGRO);
  bool valLineRight = (digitalRead(PIN_LINE_RIGHT) == ESTADO_NEGRO);
  bool valNodeLeft  = (digitalRead(PIN_NODE_LEFT) == ESTADO_NEGRO);
  bool valNodeRight = (digitalRead(PIN_NODE_RIGHT) == ESTADO_NEGRO);

  bool nodeDetected = (valNodeLeft || valNodeRight);

  // 2. Lógica del Seguidor de Línea
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

  // Ajuste por inversión de giro
  if (INVERTIR_DIRECCION_GIRO) {
    if (girarIzquierda || girarDerecha) {
      bool temp = girarIzquierda;
      girarIzquierda = girarDerecha;
      girarDerecha = temp;
    }
  }

  // Asignación de velocidades según el seguidor
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

  // Aplicar velocidad a los motores
  setMotors(speedLeft, speedRight);

  // 3. Conteo de Nodos (Marcas laterales)
  if (nodeDetected && (millis() - lastNodeDetectionTime > nodeDebounceInterval)) {
    lastNodeDetectionTime = millis();
    nodeCount++;
    Serial.printf("\n>>> [NODO DETECTADO #%d] (Sensores laterales activados -> Izq=%d Der=%d)\n", 
                  nodeCount, valNodeLeft, valNodeRight);
    
    // Parar un momento para hacer evidente la detección del nodo
    setMotors(0, 0);
    delay(400); 
  }

  // 4. Reportar sensores en tiempo real al Monitor Serial (Cada 250ms)
  if (millis() - lastSensorPrint > 250) {
    lastSensorPrint = millis();
    Serial.printf("[TEST INTEGRADO] S3_ext=%d | S1_int=%d | S2_int=%d | S4_ext=%d | Motores: L=%d R=%d\n",
                  valNodeLeft, valLineLeft, valLineRight, valNodeRight, speedLeft, speedRight);
  }

  delay(20);
}

// Función auxiliar para controlar el puente H
void setMotors(int speedL, int speedR) {
  // Aplicar factores de compensación física
  speedL = (int)(speedL * COMPENSACION_MOTOR_IZQ);
  speedR = (int)(speedR * COMPENSACION_MOTOR_DER);

  // Ajuste por inversión física
  if (INVERTIR_MOTOR_IZQ) speedL = -speedL;
  if (INVERTIR_MOTOR_DER) speedR = -speedR;

  // Límite de seguridad
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
