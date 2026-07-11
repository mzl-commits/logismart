# Arquitectura y organización

LogiSmart es un monorepo: cada directorio de primer nivel representa una
superficie desplegable o una responsabilidad de soporte.

```text
almacen_config/       Configuración Django, ASGI, WSGI y Celery
clasificacion/        Dominio, API, tareas, plantillas y pruebas del backend
  api/                Endpoints internos separados por dominio funcional
    cajas.py          Ingreso, clasificación y documentos de cajas
    catalogo.py       Maestros y configuración operativa
    stock.py          Consulta y exportación de existencias
    despachos.py      Despachos, solicitudes y planillas
    agv.py            Estado, comandos y telemetría del carro
    common.py         Infraestructura compartida de los endpoints
  management/         Comandos administrativos de Django
  migrations/         Historial inmutable del esquema de datos
  services/           Integraciones y lógica reutilizable del dominio
  static/frontend/    Build generado por Vite (no editar manualmente)
deploy/               Configuración de referencia para producción
docs/                 Documentación y sus scripts de generación
esp32_agv/            Firmware y pruebas del AGV
logismart-frontend/   Aplicación web React/Vite
logismart-movil/      Aplicación Android/Kotlin
logs/                 Directorio local de logs; solo `.gitkeep` se versiona
```

## Reglas de mantenimiento

- No versionar `.env`, bases SQLite, logs, entornos virtuales ni directorios de build.
- Añadir la lógica de negocio reutilizable a `clasificacion/services/`; las vistas de `clasificacion/api/` deben coordinar HTTP, no concentrar reglas del dominio.
- Importar endpoints nuevos desde `clasificacion.api`; `clasificacion.views` existe únicamente como fachada de compatibilidad.
- Mantener juntas las pruebas de cada capacidad (`tests_inventory.py`, `tests_mobile.py`, etc.). Si crecen, migrarlas a un paquete `tests/` por dominio.
- Tratar las migraciones aplicadas como inmutables y crear una nueva para cada cambio de modelos.
- Editar el frontend únicamente en `logismart-frontend/src/`. `npm run build` publica el resultado en `clasificacion/static/frontend/`.
- Guardar documentos fuente y scripts relacionados dentro de `docs/`; evitar temporales en la raíz.
- Mantener secretos y valores propios de cada ambiente fuera del código; documentar sus nombres en `.env.example`.

## Verificación mínima

```powershell
# Backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test

# Web
cd logismart-frontend
npm run lint
npm run build

# Android
cd logismart-movil
.\gradlew.bat testDebugUnitTest
```
