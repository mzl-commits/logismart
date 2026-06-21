"""
Django settings for almacen_config project.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Cargar .env si existe ────────────────────────────────────────────────────
def _get_env(key, default=None, required=False):
    """Lee una variable de entorno. Busca primero en .env, luego en el sistema."""
    # Intentar leer .env en la raíz del proyecto
    env_file = BASE_DIR / '.env'
    if env_file.exists() and not hasattr(_get_env, '_cache'):
        _get_env._cache = {}
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    _get_env._cache[k.strip()] = v.strip()

    value = getattr(_get_env, '_cache', {}).get(key) or os.environ.get(key, default)
    if required and not value:
        raise ValueError(f"Variable de entorno requerida no encontrada: {key}")
    return value


# ─── Seguridad ────────────────────────────────────────────────────────────────
SECRET_KEY = _get_env(
    'DJANGO_SECRET_KEY',
    default='django-insecure-solo-desarrollo-cambia-en-produccion',
)

DEBUG = _get_env('DJANGO_DEBUG', default='True').lower() == 'true'

ALLOWED_HOSTS = _get_env('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')


# ─── Aplicaciones ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'daphne',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    'clasificacion',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'API Robot AGV Logística',
    'DESCRIPTION': 'Documentación de los endpoints para el sistema inteligente de logística y carrito automatizado.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'almacen_config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'almacen_config.wsgi.application'
ASGI_APPLICATION = 'almacen_config.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


# ─── Configuración ESP32 ──────────────────────────────────────────────────────
ESP32_CONFIG = {
    'PORT': _get_env('ESP32_PORT', default='COM3'),
    'BAUD_RATE': 115200,
    'TIMEOUT': 2,
    'SIMULATION_MODE': _get_env('ESP32_SIMULATION_MODE', default='True').lower() == 'true',
}


# ─── CORS ─────────────────────────────────────────────────────────────────────
# En desarrollo se permite todo; en producción, listar orígenes explícitamente
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = _get_env('CORS_ALLOWED_ORIGINS', default='').split(',')


# ─── Base de datos ────────────────────────────────────────────────────────────
# SQLite para desarrollo. Para producción usar PostgreSQL:
#   ENGINE: django.db.backends.postgresql
#   NAME / USER / PASSWORD / HOST / PORT desde variables de entorno
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


# ─── Validación de contraseñas ────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─── Internacionalización ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True


# ─── Archivos estáticos ───────────────────────────────────────────────────────
STATIC_URL = 'static/'


# ─── Logging ──────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'clasificacion': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# ─── Configuración MQTT ───────────────────────────────────────────────────────
MQTT_CONFIG = {
    'BROKER': _get_env('MQTT_BROKER', default='38.250.116.213'),  # Por defecto el broker del VPS
    'PORT': int(_get_env('MQTT_PORT', default=1883)),
    'USER': _get_env('MQTT_USER', default='yuri'),
    'PASS': _get_env('MQTT_PASS', default='Montescoli3'),
    'TOPIC_TELEMETRIA': 'logismart/carro/telemetria',
    'TOPIC_COMANDO': 'logismart/carro/comando',
}

LOGIN_URL = '/login/'

