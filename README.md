# LogiSmart

Sistema web para clasificacion, almacenamiento y despacho asistido por AGV.
El proyecto combina Django, DRF, Channels, Redis, PostgreSQL, MQTT y un
frontend web para operar un almacen inteligente con telemetria en tiempo real.

## Estado actual

- Backend principal en Django/ASGI.
- Produccion desplegada detras de Nginx + Daphne.
- Base de datos de produccion migrada a PostgreSQL.
- Redis habilitado para Channels.
- MQTT autenticado para comandos y telemetria del AGV.
- Suscripciones Stripe conectadas en modo de prueba.
- Endpoints internos protegidos por sesion.
- API externa `v1` protegida con `X-API-Key`.

## Modulos principales

- `clasificacion/`: logica de negocio, API, vistas web, servicios AGV y MQTT.
- `almacen_config/`: configuracion Django/ASGI.
- `deploy/`: unidades `systemd` y configuracion Nginx de referencia.
- `logismart-frontend/`: frontend complementario del proyecto.
- `esp32_agv/`: firmware/documentacion del AGV.

## Arquitectura rapida

```text
Browser / Cliente externo
        |
      Nginx (HTTPS)
        |
      Daphne (ASGI)
        |
  Django + DRF + Channels
     |        |         |
 Postgres   Redis     MQTT
                         |
                       ESP32 / AGV
```

## Puesta en marcha local

1. Crear entorno virtual e instalar dependencias.
2. Copiar `.env.example` a `.env`.
3. Configurar variables minimas.
4. Ejecutar migraciones.
5. Levantar el servidor.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

En Linux/macOS:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Variables importantes

Las variables completas estan en `.env.example`. Las mas relevantes son:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `REDIS_URL`
- `MQTT_BROKER`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`
- `EXTERNAL_API_KEY`
- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`

## Seguridad aplicada

- `DEBUG=False` en produccion.
- `SECRET_KEY` obligatoria fuera de desarrollo.
- Cookies seguras y redireccion HTTPS.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- API REST interna autenticada por sesion.
- API externa protegida con comparacion de clave en tiempo constante.
- WebSocket anonimo rechazado.
- Credenciales sensibles eliminadas de defaults de codigo.

## Operacion y despliegue

- [docs/DEPLOYMENT.md](/C:/Users/Asus%20TUF%20F15/proyecto_logistica/docs/DEPLOYMENT.md)
- [docs/SECURITY.md](/C:/Users/Asus%20TUF%20F15/proyecto_logistica/docs/SECURITY.md)
- [docs/OPERATIONS.md](/C:/Users/Asus%20TUF%20F15/proyecto_logistica/docs/OPERATIONS.md)

## Pruebas

```bash
python manage.py test -v 1
```

Estado verificado durante esta actualizacion:

- Local: `28/28` tests OK.
- Servidor con PostgreSQL y `DEBUG=False`: `28/28` tests OK.
- `http://` redirige a `https://`.
- `/api/cajas/` y `/api/v1/cajas` responden `403` sin credenciales.
- `/api/v1/cajas` responde `200` con `X-API-Key` valida.

## Pendientes recomendados

- Rotar claves Stripe antes de pasar a produccion real.
- Considerar TLS para MQTT si el AGV operara fuera de una red confiable.
- Automatizar `pg_dump` con retencion.
- Documentar versionado del firmware ESP32 junto con comandos MQTT soportados.
