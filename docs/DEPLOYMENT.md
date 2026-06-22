# Despliegue

## Stack de produccion

- Debian 12
- Python 3.12
- Django ASGI con Daphne
- PostgreSQL 15
- Redis 7
- Mosquitto MQTT
- Nginx como proxy inverso HTTPS

## Servicios incluidos

- `deploy/logismart.service`
  Servicio principal ASGI.

- `deploy/logismart-mqtt.service`
  Listener de telemetria MQTT para actualizar el estado del AGV.

- `deploy/nginx-logismart.conf`
  Proxy HTTPS con soporte para WebSocket y archivos estaticos.

## Flujo recomendado de despliegue

1. Actualizar codigo del proyecto.
2. Activar entorno virtual.
3. Instalar dependencias.
4. Ejecutar migraciones.
5. Recolectar estaticos.
6. Reiniciar servicios.

```bash
cd /home/yuri/proyecto_logistica
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart logismart.service
sudo systemctl restart logismart-mqtt.service
sudo systemctl reload nginx
```

## Verificaciones utiles

```bash
sudo systemctl status --no-pager logismart.service
sudo systemctl status --no-pager logismart-mqtt.service
curl -I http://logistica.promube.com/
curl -k -I https://logistica.promube.com/
curl -k -I https://logistica.promube.com/static/admin/css/base.css
```

## Resultado esperado

- HTTP `80` redirige a HTTPS.
- Sitio principal responde `302` a login cuando no hay sesion.
- Estaticos responden `200`.
- API sin credenciales responde `403`.
- Servicios `logismart.service` y `logismart-mqtt.service` quedan `active (running)`.
