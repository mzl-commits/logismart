// ==========================================
// RUTINA DE PRUEBA: AVANCE Y GIROS BÁSICOS
// ==========================================

// Pines Motor Izquierdo (M1)
const int enA = 33; 
const int in1 = 25; 
const int in2 = 14; 

// Pines Motor Derecho (M2)
const int enB = 23; 
const int in3 = 21; 
const int in4 = 19; 

void setup() {
  Serial.begin(115200); 
  
  // Configurar pines como salidas
  pinMode(enA, OUTPUT); pinMode(in1, OUTPUT); pinMode(in2, OUTPUT);
  pinMode(enB, OUTPUT); pinMode(in3, OUTPUT); pinMode(in4, OUTPUT);
  
  frenar(); // Arranca totalmente detenido por seguridad
  delay(3000); // Te da 3 segundos para ponerlo en el piso después de encenderlo
  
  Serial.println("\n--- RUTINA DE MOVIMIENTO INICIADA ---");
}

void loop() {
  Serial.println("Avanzando...");
  avanzar(150);
  delay(2000); // Camina hacia adelante por 2 segundos

  Serial.println("Frenando...");
  frenar();
  delay(1000); // Pausa de 1 segundo

  Serial.println("Girando a la derecha...");
  girarDerecha(150);
  delay(1000); // Gira sobre su propio eje por 1 segundo

  Serial.println("Frenando...");
  frenar();
  delay(1000);

  Serial.println("Girando a la izquierda...");
  girarIzquierda(150);
  delay(1000); // Regresa al centro girando a la izquierda

  Serial.println("Frenando y reiniciando ciclo...");
  frenar();
  delay(2000); // Pausa de 2 segundos antes de repetir todo el ciclo
}

// ==========================================
// FUNCIONES DE MOVIMIENTO (ESPEJO APLICADO)
// ==========================================

void avanzar(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  
  // M1 (Izquierdo): Adelante
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  // M2 (Derecho): Adelante
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW); 
}

void girarDerecha(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  
  // M1 (Izquierdo): Adelante
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  // M2 (Derecho): Atrás
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH); 
}

void girarIzquierda(int velocidad) {
  analogWrite(enA, velocidad); analogWrite(enB, velocidad);
  
  // M1 (Izquierdo): Atrás
  digitalWrite(in1, HIGH);  digitalWrite(in2, LOW);
  // M2 (Derecho): Adelante
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW); 
}

void frenar() {
  analogWrite(enA, 0); analogWrite(enB, 0);
  
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
}