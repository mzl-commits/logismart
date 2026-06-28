# LogiSmart Mobile — módulo Wash

Aplicación Android para consultar el estado operativo de LogiSmart desde un
teléfono o emulador. El módulo usa Kotlin, Jetpack Compose, Material 3,
Navigation Compose, DataStore Preferences, Retrofit y coroutines.

## Responsable

- Wash — Luis Washinton Berrio Valencia
- GitHub: `luisberrio-lang`
- Rama de trabajo: `feature/wash/auth`

## Módulos implementados

- Login con validación, carga, errores y autenticación contra Django.
- Token firmado persistido con DataStore.
- Sesión con expiración controlada por el backend.
- Limpieza automática de sesión ante respuestas HTTP 401.
- Navegación protegida entre Login y Dashboard.
- Dashboard con estado del carro, alertas, cajas y despachos.
- Actualización manual del resumen.
- Logout con limpieza del back stack.
- Canal y notificación local para alertas logísticas.
- Solicitud de `POST_NOTIFICATIONS` en Android 13 o superior.

## Estructura

```text
app/src/main/java/com/logismart/mobile/
├── MainActivity.kt
├── LogiSmartApplication.kt
├── core/
│   ├── navigation/
│   ├── network/
│   ├── notifications/
│   ├── session/
│   └── ui/theme/
└── feature/
    ├── auth/
    └── dashboard/
```

## Abrir y ejecutar

1. Abrir Android Studio.
2. Seleccionar `Open` y elegir la carpeta `android-app/`.
3. Esperar la sincronización de Gradle.
4. Iniciar Django desde la raíz del repositorio:

   ```powershell
   .\venv\Scripts\activate
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver 0.0.0.0:8000
   ```

5. Ejecutar la configuración `app` en un emulador API 26 o superior.

El emulador usa por defecto `http://10.0.2.2:8000/`, que apunta al equipo
anfitrión. Para usar un dispositivo físico, indicar una URL accesible en la red:

```powershell
.\gradlew.bat assembleDebug -PLOGISMART_API_URL=http://192.168.1.20:8000/
```

La URL debe terminar en `/`. Para producción se debe utilizar HTTPS.

## Endpoints

### `POST /api/mobile/login/`

```json
{
  "username": "admin",
  "password": "admin"
}
```

Retorna un token firmado, el usuario y su nombre. El token vence después de
ocho horas.

### `GET /api/mobile/dashboard/`

Requiere:

```http
Authorization: Bearer TOKEN
```

Retorna estado del carro, alertas activas, cajas pendientes, despachos
completados y accesos rápidos. Un token inválido o vencido produce HTTP 401 y
la aplicación vuelve automáticamente al Login.

## Verificación

En Windows:

```powershell
cd android-app
.\gradlew.bat build
```

Pruebas específicas del contrato móvil:

```powershell
cd ..
.\venv\Scripts\python.exe manage.py test clasificacion.tests_mobile -v 1
```

## Flujo Git

- No realizar push directo a `main`.
- Trabajar en ramas `feature/wash/*`.
- Mantener commits Conventional Commits para `auth`, `navigation`,
  `dashboard`, `notifications` y documentación.
- Crear Pull Request desde `feature/wash/auth` hacia `develop`.

## Capturas para la exposición

Tomar capturas de:

1. Estructura del proyecto abierta en Android Studio.
2. Pantalla Login vacía.
3. Validación de campos y credenciales incorrectas.
4. Login durante el estado de carga.
5. Dashboard con las cuatro tarjetas de resumen.
6. Notificación “Alerta LogiSmart” visible.
7. Diálogo de permiso de notificaciones en Android 13+.
8. Regreso al Login después de cerrar sesión.
9. Consola con `BUILD SUCCESSFUL`.
10. Pruebas del contrato móvil finalizadas con `OK`.
