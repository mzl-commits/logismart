# Seguridad

## Controles aplicados

- Los secretos se leen desde `.env` o variables del entorno; no se definen valores sensibles en el código.
- En producción son obligatorios `DJANGO_SECRET_KEY`, `EXTERNAL_API_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `REDIS_URL` y PostgreSQL.
- La API interna requiere una sesión autenticada y la API externa `v1` exige `X-API-Key`.
- Los tokens móviles solo se aceptan mediante `Authorization: Bearer`.
- Las respuestas de error no exponen excepciones internas.
- HTTPS, HSTS, cookies seguras, `X-Content-Type-Options` y `X-Frame-Options` se activan fuera de desarrollo.
- La aplicación móvil bloquea tráfico HTTP no cifrado y no registra cuerpos de solicitudes HTTP.

## Operación segura

- Mantener `.env` fuera de Git y rotar claves ante cualquier exposición.
- Usar PostgreSQL, HTTPS y Redis en producción.
- Restringir `DJANGO_ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` a dominios reales.
- Ejecutar `python manage.py check --deploy` antes de cada despliegue.
