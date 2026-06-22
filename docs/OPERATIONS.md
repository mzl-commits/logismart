# Operacion

## Servicios del sistema

- `logismart.service`: backend ASGI.
- `logismart-mqtt.service`: listener de telemetria AGV.
- `nginx`: proxy HTTPS.
- `postgresql`: base de datos principal.
- `redis-server`: capa de Channels.
- `mosquitto`: broker MQTT.

## Comandos frecuentes

```bash
sudo systemctl status --no-pager logismart.service
sudo systemctl status --no-pager logismart-mqtt.service
sudo journalctl -u logismart.service -n 100 --no-pager
sudo journalctl -u logismart-mqtt.service -n 100 --no-pager
```

## Estado funcional esperado

- Caja nueva entra como `pendiente`.
- Al procesarse, el sistema reserva una `Ubicacion` compatible y la marca
  ocupada dentro de la misma transaccion.
- El AGV recibe la ruta por MQTT.
- Al confirmar parada, la caja pasa a `almacenada`.
- Al despacharse, la ubicacion se libera.

## Integraciones

### API interna

- Usa sesion Django.
- Pensada para UI web y personal autenticado.

### API externa `v1`

- Usa encabezado `X-API-Key`.
- Disenada para integracion con sistemas externos o dispositivos.

### Stripe

- La integracion actual esta en modo de prueba.
- Webhook configurado: `/suscripcion/webhook/`

## Incidencias comunes

### `403` en archivos estaticos

Revisar permisos de `/var/www/logismart/static`:

```bash
sudo find /var/www/logismart/static -type d -exec chmod 755 {} +
sudo find /var/www/logismart/static -type f -exec chmod 644 {} +
```

### `permission denied to create database` al correr tests

Para pruebas en servidor con PostgreSQL, el rol de aplicacion necesita permiso
temporal `CREATEDB` o una estrategia distinta de base de datos de test.
