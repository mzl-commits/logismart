/**
 * LogiSmart AGV - Sketch de Prueba de Secuencia Basada en Sensores (v4.0)
 * 
 * Esta versión ejecuta la secuencia guiándose por los sensores ópticos:
 * 1. Avanza recto siguiendo la línea (Seguidor de Línea).
 * 2. Al detectar un nodo (sensor lateral en negro), inicia la secuencia:
 *    a) Gira a la derecha hasta detectar la línea negra transversal.
 *    b) Se detiene durante 2 segundos.
 *    c) Hace una vuelta de 180 grados (giro en U) hasta detectar la línea nuevamente.
 *    d) Sale del nodo girando a la izquierda hasta alinearse con la línea izquierda.
 * 3. Se detiene al finalizar la secuencia.
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
// ─── CONFIGURACIÓN DE CALIBRACIÓN ────────────────────────────────────────────
const float COMPENSACION_MOTOR_IZQ = 1.0; 
const float COMPENSACION_MOTOR_DER = 1.0;
const bool INVERTIR_MOTOR_IZQ = false;
const bool INVERTIR_MOTOR_DER = true;
const bool INVERTIR_DIRECCION_GIRO = true; 
// La línea negra va en el medio de los sensores (true) o debajo (false)
const bool MODO_STRADDLE = true; 
// Polaridad del sensor: LOW en negro, HIGH en blanco (sensores activos en bajo)
#define ESTADO_NEGRO LOW
#define ESTADO_BLANCO HIGH
// Velocidad base (0 a 255)
int baseSpeedForward = 120;
int turnSpeed = 120; // Velocidad para los giros de la secuencia
// ─── TIEMPOS CIEGOS (DEBOUNCE DE SENSORES) ────────────────────────────────────
// Estos tiempos evitan que el robot detecte la misma línea de la que está saliendo
// o líneas intermedias (en giros de 180 grados).
const unsigned long DELAY_CIEGO_90  = 350;  // Tiempo mínimo girando antes de buscar la línea (ms)
const unsigned long DELAY_CIEGO_180 = 900;  // Tiempo mínimo para pasar el primer cruce en giro de 180 (ms)
// Estados de la Secuencia
enum SecuenciaEstado {
  BUSCANDO_NODO = 0,      // Avanza recto / siguiendo línea hasta ver sensor lateral
  GIRANDO_DERECHA = 1,    // Gira a la derecha buscando la línea
  ESPERA_DERECHA = 2,     // Espera parado 2 segundos después del giro
  VUELTA_180 = 3,         // Da media vuelta buscando la línea
  SALIENDO_IZQUIERDA = 4, // Sale a la izquierda buscando la línea
  COMPLETADO = 5          // Se detiene y finaliza la prueba
};
SecuenciaEstado estadoSecuencia = BUSCANDO_NODO;
int subEstadoGiro = 0; // 0: Tiempo ciego, 1: Buscando línea con sensores
unsigned long tiempoInicioEstado = 0;
unsigned long lastSensorPrint = 0;
int speedLeft = 0;
int speedRight = 0;
void setup() {
  Serial.begin(9600);
  delay(1500);
  Serial.println("\n=============================================");
  Serial.println("  TEST SECUENCIA CON SENSORES: RECTO -> NODO -> DER -> 180 -> IZQ ");
  Serial.println("=============================================");
  Serial.println("El carro iniciará siguiendo la línea.");
  Serial.println("Giros 100% controlados por sensores ópticos.");
  Serial.println("Escribe 'r' en el monitor serial para reiniciar la secuencia.");
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
  // Comandos por monitor serial para reiniciar la prueba
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'r' || cmd == 'R') {
      estadoSecuencia = BUSCANDO_NODO;
      subEstadoGiro = 0;
      Serial.println("\n>>> SECUENCIA REINICIADA: Buscando nodo...");
    }
  }
  // 1. Leer Sensores
  bool valLineLeft  = (digitalRead(PIN_LINE_LEFT) == ESTADO_NEGRO);
  bool valLineRight = (digitalRead(PIN_LINE_RIGHT) == ESTADO_NEGRO);
  bool valNodeLeft  = (digitalRead(PIN_NODE_LEFT) == ESTADO_NEGRO);
  bool valNodeRight = (digitalRead(PIN_NODE_RIGHT) == ESTADO_NEGRO);
  bool nodeDetected = (valNodeLeft || valNodeRight);
  unsigned long currentMillis = millis();
  // 2. Máquina de Estados de la Secuencia
  switch (estadoSecuencia) {
    
    case BUSCANDO_NODO:
      // Seguidor de línea normal
      bool irRecto;
      bool girarIzquierda;
      bool girarDerecha;
      irRecto = false;
      girarIzquierda = false;
      girarDerecha = false;
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
      } else {
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
      if (irRecto) {
        speedLeft = baseSpeedForward;
        speedRight = baseSpeedForward;
      } else if (girarIzquierda) {
        speedLeft = -baseSpeedForward / 2;
        speedRight = baseSpeedForward;
      } else if (girarDerecha) {
        speedLeft = baseSpeedForward;
        speedRight = -baseSpeedForward / 2;
      }
      // Detectar marca de nodo lateral
      if (nodeDetected) {
        estadoSecuencia = GIRANDO_DERECHA;
        subEstadoGiro = 0; // Iniciar en tiempo ciego
        tiempoInicioEstado = currentMillis;
        Serial.println("\n>>> [1/5] ¡NODO DETECTADO! Iniciando giro a la derecha por sensores...");
      }
      break;
    case GIRANDO_DERECHA:
      // Pivot a la derecha (rueda izquierda adelante, derecha atrás)
      speedLeft = turnSpeed;
      speedRight = -turnSpeed;
      if (subEstadoGiro == 0) {
        // Esperamos a salir de la línea actual
        if (currentMillis - tiempoInicioEstado >= DELAY_CIEGO_90) {
          subEstadoGiro = 1;
          Serial.println(" -> [Giro Der] Salió de la línea de origen. Buscando nueva línea...");
        }
      } 
      else if (subEstadoGiro == 1) {
        // Buscamos que cualquiera de los sensores frontales toque la nueva línea
        if (valLineLeft || valLineRight) {
          estadoSecuencia = ESPERA_DERECHA;
          tiempoInicioEstado = currentMillis;
          Serial.println(" -> [Giro Der] ¡Línea detectada! Frenando por 2 segundos.");
        }
      }
      break;
    case ESPERA_DERECHA:
      // Detener motores por 2 segundos
      speedLeft = 0;
      speedRight = 0;
      if (currentMillis - tiempoInicioEstado >= 2000) {
        estadoSecuencia = VUELTA_180;
        subEstadoGiro = 0; // Iniciar en tiempo ciego
        tiempoInicioEstado = currentMillis;
        Serial.println("\n>>> [2/5] Fin de espera. Iniciando vuelta de 180 grados por sensores...");
      }
      break;
    case VUELTA_180:
      // Rotar en su propio eje para dar media vuelta (pivot izquierdo: rueda izq atrás, der adelante)
      speedLeft = -turnSpeed;
      speedRight = turnSpeed;
      if (subEstadoGiro == 0) {
        // Esperamos el tiempo ciego para no leer la línea actual ni la transversal de 90°
        if (currentMillis - tiempoInicioEstado >= DELAY_CIEGO_180) {
          subEstadoGiro = 1;
          Serial.println(" -> [Vuelta 180] Pasó el delay ciego. Buscando línea de retorno...");
        }
      } 
      else if (subEstadoGiro == 1) {
        // Detenerse cuando vuelva a alinearse
        if (valLineLeft || valLineRight) {
          estadoSecuencia = SALIENDO_IZQUIERDA;
          subEstadoGiro = 0; // Iniciar en tiempo ciego
          tiempoInicioEstado = currentMillis;
          Serial.println(" -> [Vuelta 180] ¡Línea detectada! Iniciando salida a la izquierda...");
        }
      }
      break;
    case SALIENDO_IZQUIERDA:
      // Pivot a la izquierda (rueda izquierda atrás, derecha adelante)
      speedLeft = -turnSpeed;
      speedRight = turnSpeed;
      if (subEstadoGiro == 0) {
        // Esperamos a salir de la línea actual
        if (currentMillis - tiempoInicioEstado >= DELAY_CIEGO_90) {
          subEstadoGiro = 1;
          Serial.println(" -> [Giro Izq] Salió de la línea de origen. Buscando línea izquierda...");
        }
      } 
      else if (subEstadoGiro == 1) {
        // Buscamos alinearnos con la línea de la izquierda
        if (valLineLeft || valLineRight) {
          estadoSecuencia = COMPLETADO;
          tiempoInicioEstado = currentMillis;
          Serial.println("\n>>> [3/5] Giro a la izquierda completado. Secuencia FINALIZADA.");
        }
      }
      break;
    case COMPLETADO:
      // Detener motores por completo
      speedLeft = 0;
      speedRight = 0;
      break;
  }
  // Aplicar velocidad calculada
  setMotors(speedLeft, speedRight);
  // 3. Reportar estado y lecturas al Monitor Serial (Cada 250ms)
  if (currentMillis - lastSensorPrint > 250) {
    lastSensorPrint = currentMillis;
    const char* nombreEstado = "";
    switch (estadoSecuencia) {
      case BUSCANDO_NODO:      nombreEstado = "BUSCANDO_NODO"; break;
      case GIRANDO_DERECHA:    nombreEstado = "GIRANDO_DERECHA (Sensores)"; break;
      case ESPERA_DERECHA:     nombreEstado = "ESPERA_DERECHA (2s)"; break;
      case VUELTA_180:        nombreEstado = "VUELTA_180 (Sensores)"; break;
      case SALIENDO_IZQUIERDA: nombreEstado = "SALIENDO_IZQUIERDA (Sensores)"; break;
      case COMPLETADO:         nombreEstado = "COMPLETADO (PARADO)"; break;
    }
    Serial.printf("[ESTADO: %s | SubGiro: %d] Sensores: LatIzq=%d | FrntIzq=%d | FrntDer=%d | LatDer=%d | Motores: L=%d R=%d\n",
                  nombreEstado, subEstadoGiro, valNodeLeft, valLineLeft, valLineRight, valNodeRight, speedLeft, speedRight);
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