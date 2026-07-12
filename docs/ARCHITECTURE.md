# Arquitectura

LogiSmart centraliza clasificación, almacenamiento, inventario, planillas y despacho.

```text
almacen_config/       Configuración Django y ASGI
clasificacion/        Dominio, API, tareas, plantillas y pruebas
logismart-frontend/   Aplicación React/Vite
logismart-movil/      Aplicación Android/Kotlin
deploy/               Configuración de despliegue
docs/                 Documentación técnica
```

El backend Django expone una API autenticada para los clientes web y móvil. PostgreSQL es la base de producción; Redis puede respaldar tareas Celery. El frontend se publica mediante `npm run build` en `clasificacion/static/frontend/`.
