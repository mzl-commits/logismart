# Documentación de la Última Copia de Seguridad — LogiSmart

Esta documentación describe el alcance, la estructura y el procedimiento de restauración de la última copia de seguridad realizada el **21 de junio de 2026** a las **23:50 (hora local)**. Estos respaldos protegen tanto el código fuente de integración de LogiSmart como la base de datos SQLite3 en producción que corre en el servidor VPS.

---

## 1. Resumen de Archivos de Respaldo

Los archivos generados se almacenan localmente en el directorio de backups de la aplicación:
`C:\Users\Asus TUF F15\.gemini\antigravity\brain\48d477d8-7c2f-4327-b15f-fecb7538bad5\backups\`

### A) Copia de Seguridad del Código Fuente y Configuración (Local)
* **Nombre de Archivo**: [logismart_backup_v1stable_20260621_2350.zip](file:///C:/Users/Asus%20TUF%20F15/.gemini/antigravity/brain/48d477d8-7c2f-4327-b15f-fecb7538bad5/backups/logismart_backup_v1stable_20260621_2350.zip)
* **Tamaño**: Aprox. 1.2 MB
* **Método de Generación**: Compresión ZIP selectiva (excluyendo directorios de caché y entornos virtuales).
* **Alcance**: Código fuente del Backend Django y configuraciones críticas de despliegue antes de la fusión de la API v1.

### B) Snapshot de Base de Datos del Servidor de Producción (VPS)
* **Nombre de Archivo**: [db_vps_snapshot_20260621_2350.sqlite3](file:///C:/Users/Asus%20TUF%20F15/.gemini/antigravity/brain/48d477d8-7c2f-4327-b15f-fecb7538bad5/backups/db_vps_snapshot_20260621_2350.sqlite3)
* **Tamaño**: 244.0 KB
* **Método de Generación**: Descarga segura vía protocolo SFTP directamente desde el VPS (`38.250.116.213`).
* **Estado de los Datos**: 
  - **Cajas Registradas**: 8 cajas.
  - **Ubicaciones (Racks)**: 25 ubicaciones físicas pre-configuradas.

---

## 2. Estructura y Contenido de los Archivos

### A) Contenido del ZIP (`logismart_backup_v1stable_...zip`)
El archivo comprimido contiene una réplica exacta del entorno de desarrollo limpio y estructurado de la siguiente forma:

* **`almacen_config/`**: Configuración global del proyecto Django.
  - `settings.py`: Variables de entorno, middlewares, bases de datos e integraciones activas (Daphne, Django REST Framework, Stripe).
  - `urls.py`: Rutas globales y redirecciones del proyecto.
  - `asgi.py` / `wsgi.py`: Servidor asíncrono y síncrono para la pasarela de servicios web.
* **`clasificacion/`**: Lógica de negocio, vistas, modelos e integraciones físicas (AGV).
  - `models.py`: Modelado de Base de Datos (Cajas, Ubicaciones, Historial, Despachos).
  - `views.py` / `views_frontend.py` / `views_v1.py`: Controladores REST, frontend y adaptadores de API de stock.
  - `templates/`: Plantillas HTML del Dashboard con tema oscuro, configuración e interfaces de usuario.
  - `services/`: Lógica de optimización de racks, cálculo de rutas óptimas e integración serial con firmware de ESP32.
  - `management/commands/mqtt_listener.py`: Servidor worker de escucha MQTT encargado de la comunicación bidireccional con el AGV.
  - `migrations/`: Historial secuencial de cambios de base de datos.
* **`manage.py`**: Interfaz de comandos administrativos de Django.
* **`requirements.txt`**: Librerías y paquetes dependientes exactos en Python 3.12 (Django 6.0.4, Daphne, Channels, Stripe, etc.).
* **`.env`**: Archivo de credenciales locales (Stripe, MQTT local, tokens de desarrollo).

### B) Contenido del Snapshot de Base de Datos (`db_vps_snapshot_...sqlite3`)
Se trata de una copia exacta en caliente de la base de datos de producción basada en SQLite3. Las tablas críticas respaldadas son:
* `caja`: Contiene los registros individuales de las cajas de inventario (IDs, peso, fragilidad, prioridades, estados).
* `ubicaciones`: Grilla de coordenadas del almacén físico con flags de disponibilidad, categoría y límites de peso.
* `despacho`: Bitácora histórica de salidas definitivas con placa de transporte, destinos y usuarios responsables.
* `historial_movimientos`: Logs transaccionales detallando el tránsito interno de cada caja por el almacén.
* `usuarios`: Operarios de almacén autorizados en el sistema.

---

## 3. Scripts de Automatización de Copias de Seguridad

Existen dos scripts en la carpeta de herramientas locales que facilitan la regeneración de copias de seguridad de forma automatizada:

1. **Respaldar Código Local**:
   - **Script**: [make_backup.py](file:///C:/Users/Asus%20TUF%20F15/.gemini/antigravity/brain/48d477d8-7c2f-4327-b15f-fecb7538bad5/scratch/make_backup.py)
   - **Ejecución**: `python make_backup.py`
   - **Acción**: Lee los directorios del proyecto local, descarta las carpetas `__pycache__` e inyecta la hora en formato `YYYYMMDD_HHMM` al nombre final del `.zip`.
2. **Respaldar Base de Datos del VPS**:
   - **Script**: [backup_vps_db.py](file:///C:/Users/Asus%20TUF%20F15/.gemini/antigravity/brain/48d477d8-7c2f-4327-b15f-fecb7538bad5/scratch/backup_vps_db.py)
   - **Ejecución**: `python backup_vps_db.py`
   - **Acción**: Se conecta por SSH mediante Paramiko al VPS, comprueba en caliente el conteo de registros e inicia una descarga SFTP del archivo `db.sqlite3` guardándolo localmente con un sufijo de fecha y hora.

---

## 4. Guía de Restauración Paso a Paso

> [!WARNING]
> Restaurar una copia de seguridad sobrescribirá los datos del entorno actual. Asegúrese de realizar una copia de respaldo manual preventiva antes de proceder.

### Caso A: Restaurar el Código Local en un Entorno Nuevo
Si desea levantar el proyecto desde cero en su máquina local:

1. **Extraer Archivos**:
   Cree una carpeta destino (ej. `c:\proyecto_logistica_restored`) y descomprima el archivo `logismart_backup_v1stable_20260621_2350.zip` en ella.
2. **Crear Entorno Virtual**:
   Abra una terminal en el directorio y configure un entorno virtual aislado con Python 3.12:
   ```bash
   python -m venv venv
   ```
3. **Activar Entorno Virtual**:
   * Windows PowerShell: `.\venv\Scripts\Activate.ps1`
   * Linux / MacOS: `source venv/bin/activate`
4. **Instalar Dependencias**:
   Instale los paquetes especificados en la copia de seguridad:
   ```bash
   pip install -r requirements.txt
   ```
5. **Ejecutar Migraciones e Iniciar Servidor**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Caso B: Restaurar la Base de Datos de Producción (VPS)
En caso de pérdida catastrófica de datos en el servidor y necesidad de restaurar el estado al 21 de junio de 2026 a las 23:50:

1. **Detener el Servidor Daphne en el VPS**:
   Acceda por SSH al servidor VPS y cierre la pantalla de screen activa:
   ```bash
   screen -S logismart -X quit
   ```
2. **Copiar y Reemplazar el Archivo SQLite3**:
   Utilice un cliente de SFTP (como FileZilla, WinSCP o mediante consola) para subir el snapshot `db_vps_snapshot_20260621_2350.sqlite3` al VPS. Renómbrelo y sobrescriba el archivo activo en `/home/yuri/proyecto_logistica/db.sqlite3`.
3. **Reiniciar los Servicios en el VPS**:
   Inicie nuevamente Daphne de forma persistente dentro de un screen dedicado:
   ```bash
   screen -dmS logismart bash -c 'cd ~/proyecto_logistica && source venv/bin/activate && python manage.py runserver 127.0.0.1:8008'
   ```
   Reinicie también el backend Nginx para asegurar que las conexiones se restablezcan:
   ```bash
   sudo systemctl restart nginx
   ```
4. **Verificar**:
   Realice un GET a `/api/v1/cajas` para confirmar que las cajas y racks han vuelto a su estado respaldado.
