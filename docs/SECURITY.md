# Seguridad

## Mejoras aplicadas

- Variables de entorno priorizadas sobre defaults locales.
- `SECRET_KEY` obligatoria cuando `DEBUG=False`.
- `ALLOWED_HOSTS` y origenes CSRF configurables por entorno.
- `SECURE_SSL_REDIRECT=True` en produccion.
- Cookies `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE`.
- `SECURE_PROXY_SSL_HEADER` para Nginx.
- HSTS activado con `max-age=3600`.
- API interna DRF protegida con `SessionAuthentication` + `IsAuthenticated`.
- API `v1` protegida con `X-API-Key`.
- WebSockets anonimos cerrados con codigo `4401`.
- Publicacion MQTT centralizada y autenticada.

## Decisiones importantes

- HSTS no usa `includeSubDomains` ni `preload` porque el dominio compartido
  `promube.com` aloja otros proyectos y no conviene imponer esa politica a
  todos los subdominios.

- Mosquitto sigue en `1883` porque el AGV actual necesita compatibilidad
  simple. Ya existe autenticacion, pero no TLS extremo a extremo.

## Riesgos todavia abiertos

- Las claves Stripe compartidas durante pruebas deben rotarse antes de pasar
  a cobros reales.
- Si el AGV operara fuera de una LAN confiable, conviene migrar MQTT a TLS.
- La clave `EXTERNAL_API_KEY` debe distribuirse solo por un canal seguro.

## Comprobaciones rapidas

```bash
curl -k -I https://logistica.promube.com/api/cajas/
curl -k -I https://logistica.promube.com/api/v1/cajas
```

Ambos endpoints deben responder `401` o `403` sin autenticacion.
