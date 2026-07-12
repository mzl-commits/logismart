# Estado de mejoras pendientes

## Hecho

- [x] Migracion de produccion desde SQLite a PostgreSQL.
- [x] Redis configurado para Channels.
- [x] Despliegue ASGI con Daphne y `systemd`.
- [x] Endurecimiento de seguridad Django/DRF.
- [x] API externa `v1` protegida con `X-API-Key`.
- [x] WebSocket anonimo bloqueado.
- [x] Suscripcion Stripe corrigiendo error de template.
- [x] Reserva atomica de ubicaciones para evitar dobles asignaciones.

## Recomendado a corto plazo

- [ ] Rotar credenciales Stripe antes de produccion real.
- [ ] Automatizar `pg_dump` con politica de retencion.
