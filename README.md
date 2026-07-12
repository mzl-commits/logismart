# LogiSmart

Sistema web para clasificación, almacenamiento y despacho de inventario.
El proyecto combina Django, DRF, PostgreSQL y un frontend web para operar un
almacén inteligente.

## Estado actual

- Backend principal en Django/ASGI.
- Producción desplegada detrás de Nginx + Daphne.
- Base de datos de produccion migrada a PostgreSQL.
- Suscripciones Stripe conectadas en modo de prueba.
- Endpoints internos protegidos por sesion.
- API externa `v1` protegida con `X-API-Key`.

## Modulos principales

- `clasificacion/`: lógica de negocio, API y vistas web.
- `almacen_config/`: configuración Django.
- `deploy/`: unidades `systemd` y configuracion Nginx de referencia.
- `logismart-frontend/`: frontend complementario del proyecto.
- `logismart-movil/`: aplicación Android para la operación móvil.
- `docs/`: arquitectura, seguridad, despliegue y documentación funcional.

## Arquitectura rapida

```text
Browser / Cliente externo
        |
      Nginx (HTTPS)
        |
      Daphne (ASGI)
        |
       Django + DRF
           |
        Postgres
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
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `REDIS_URL`
- `EXTERNAL_API_KEY`
- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`

## Seguridad aplicada

- `DEBUG=False` en produccion.
- `SECRET_KEY` obligatoria fuera de desarrollo.
- Cookies seguras y redireccion HTTPS.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- API REST interna autenticada por sesion.
- API externa protegida con comparacion de clave en tiempo constante.
- Las credenciales se leen desde `.env` y no se incluyen en el código fuente.

## Operacion y despliegue

- [Organización y arquitectura](docs/ARCHITECTURE.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Seguridad](docs/SECURITY.md)
- [Operaciones](docs/OPERATIONS.md)

## Pruebas

```bash
python manage.py test -v 1
```

La validación completa incluye también `npm run lint`, `npm run build` y
`.\gradlew.bat testDebugUnitTest`. Consulta [la guía de arquitectura](docs/ARCHITECTURE.md)
para el flujo de verificación actualizado.

## Pendientes recomendados

- Rotar claves Stripe antes de pasar a produccion real.
- Automatizar `pg_dump` con retencion.
