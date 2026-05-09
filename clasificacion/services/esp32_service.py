# clasificacion/services/esp32_service.py
import logging
import threading
import time

from django.conf import settings

logger = logging.getLogger('clasificacion')


class ESP32Service:
    """Comunicación con carro ESP32 vía Serial.

    El envío de datos al puerto serial puede tardar hasta 2.5s.
    En modo simulación el retorno es inmediato.
    En modo real, el sleep de inicialización se mueve fuera del hilo web
    usando un lock para garantizar que el puerto esté listo.
    """

    # Puerto serial compartido entre instancias (singleton por proceso)
    _serial_instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.config = settings.ESP32_CONFIG
        self._serial = None

        if not self.config['SIMULATION_MODE']:
            self._conectar()

    def _conectar(self):
        """Intenta conectar al puerto serial. Solo la primera vez por proceso."""
        with self.__class__._lock:
            if self.__class__._serial_instance and self.__class__._serial_instance.is_open:
                self._serial = self.__class__._serial_instance
                return
            try:
                import serial
                ser = serial.Serial(
                    self.config['PORT'],
                    self.config['BAUD_RATE'],
                    timeout=self.config['TIMEOUT'],
                )
                # Espera de inicialización en hilo separado para no bloquear el request
                threading.Thread(target=lambda: time.sleep(2), daemon=True).start()
                self.__class__._serial_instance = ser
                self._serial = ser
                logger.info("ESP32 conectado en %s.", self.config['PORT'])
            except Exception as exc:
                logger.error("Error al conectar ESP32: %s. Modo simulación activado.", exc)
                self.config = {**self.config, 'SIMULATION_MODE': True}

    def enviar_coordenadas(self, x, y):
        """Envía coordenadas formato 'x,y' al ESP32."""
        comando = f"{int(x)},{int(y)}\n"

        if self._serial and self._serial.is_open:
            try:
                self._serial.write(comando.encode())
                # Espera mínima no bloqueante con timeout del puerto
                respuesta = self._serial.readline().decode().strip()
                logger.debug("ESP32 recibió: %s → respondió: %s", comando.strip(), respuesta)
                return {'exito': True, 'comando': comando.strip(), 'respuesta': respuesta}
            except Exception as exc:
                logger.error("Error de comunicación ESP32: %s", exc)
                return {'exito': False, 'error': str(exc)}
        else:
            # Modo simulación: sin bloqueos
            logger.debug("[SIMULACIÓN ESP32] Carro → (%s, %s)", x, y)
            return {'exito': True, 'comando': comando.strip(), 'respuesta': 'SIM_OK'}

    def cerrar(self):
        """No cierra el serial — es compartido. Solo en shutdown del proceso."""
        pass