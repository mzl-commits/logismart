/**
 * LogiSmart AGV - Sketch de Prueba de Motores y Sensores (v1.0)
 * 
 * Sube este sketch para verificar:
 * 1. Que los motores N20 giren hacia adelante, atrás y den vueltas.
 * 2. Que los 4 sensores ópticos detecten la diferencia entre la superficie blanca y la línea negra.
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

// Variables de estado del ciclo de prueba
unsigned long lastMotorChange = 0;
int testState = 0; // 0: Parado, 1: Avanzar, 2: Girar Derecha, 3: Girar Izquierda
unsigned long lastSensorPrint = 0;

void setup() {
  Serial.begin(9600);
  delay(1500);
  Serial.println("\n=============================================");
  Serial.println("   SKETCH DE PRUEBA DE MOTORES Y SENSORES   ");
  Serial.println("=============================================");
  Serial.println("Asegúrate de configurar el Monitor Serial a 9600 baudios.");
  Serial.println("Este test ciclará los motores y reportará los sensores.");
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

  // Frenar motores inicialmente
  setMotors(0, 0);
  lastMotorChange = millis();
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Ciclo de Movimiento de Motores (Cambia cada 3 segundos)
  if (currentMillis - lastMotorChange > 3000) {
    lastMotorChange = currentMillis;
    testState = (testState + 1) % 5;
    
    switch (testState) {
      case 0:
        Serial.println("\n>>> MOTORES: PARADOS (Freno)");
        setMotors(0, 0);
        break;
      case 1:
        Serial.println("\n>>> MOTORES: AVANZAR ADELANTE");
        setMotors(120, 120); // Velocidad media
        break;
      case 2:
        Serial.println("\n>>> MOTORES: retroceder atrÁS");
        setMotors(-120, -120);
        break;
      case 3:
        Serial.println("\n>>> MOTORES: GIRAR A LA DERECHA (Pivote)");
        setMotors(120, -120); // Rueda izq adelante, der atrás
        break;
      case 4:
        Serial.println("\n>>> MOTORES: GIRAR A LA IZQUIERDA (Pivote)");
        setMotors(-120, 120); // Rueda izq atrás, der adelante
        break;
    }
  }

  // 2. Lectura y Reporte de Sensores (Cada 250ms)
  if (currentMillis - lastSensorPrint > 250) {
    lastSensorPrint = currentMillis;

    // Lectura digital (HIGH o LOW)
    int s1_dig = digitalRead(PIN_LINE_LEFT);
    int s2_dig = digitalRead(PIN_LINE_RIGHT);
    int s3_dig = digitalRead(PIN_NODE_LEFT);
    int s4_dig = digitalRead(PIN_NODE_RIGHT);

    // Lectura analógica (Solo pines que soportan ADC: 32, 34, 35)
    // El pin 18 es digital y no soporta analogRead()
    int s1_ana = analogRead(PIN_LINE_LEFT);
    int s3_ana = analogRead(PIN_NODE_LEFT);
    int s4_ana = analogRead(PIN_NODE_RIGHT);

    Serial.printf("SENSORES -> [S3 Izq Ext/Pin34]: Dig=%d (Ana=%d) | [S1 Izq Int/Pin32]: Dig=%d (Ana=%d) | [S2 Der Int/Pin18]: Dig=%d | [S4 Der Ext/Pin35]: Dig=%d (Ana=%d)\n",
                  s3_dig, s3_ana, s1_dig, s1_ana, s2_dig, s4_dig, s4_ana);
  }
}

// Función auxiliar para controlar el puente H
void setMotors(int speedL, int speedR) {
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
