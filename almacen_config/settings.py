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
DEBUG = _get_env('DJANGO_DEBUG', default='False').lower() == 'true'
SECRET_KEY = _get_env(
    'DJANGO_SECRET_KEY',
    default='django-insecure-solo-desarrollo-cambia-en-produccion' if DEBUG else None,
    required=not DEBUG,
)

def _get_env_list(key, default=''):
    return [item.strip() for item in _get_env(key, default=default).split(',') if item.strip()]


ALLOWED_HOSTS = _get_env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,10.0.2.2')
EXTERNAL_API_KEY = _get_env('EXTERNAL_API_KEY', default='')

CSRF_TRUSTED_ORIGINS = _get_env_list(
    'CSRF_TRUSTED_ORIGINS',
    'https://logistica.promube.com,http://logistica.promube.com,http://127.0.0.1:5173,http://localhost:5173',
)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# ─── Aplicaciones ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
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

SPECTACULAR_SETTINGS = {
    'TITLE': 'API LogiSmart',
    'DESCRIPTION': 'Documentación de los endpoints del sistema de logística e inventario.',
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

REDIS_URL = _get_env('REDIS_URL', default='')


# ─── CORS ─────────────────────────────────────────────────────────────────────
# En desarrollo se permite todo; en producción, listar orígenes explícitamente
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = _get_env_list('CORS_ALLOWED_ORIGINS')


# ─── Base de datos ────────────────────────────────────────────────────────────
# SQLite para desarrollo. Para producción usar PostgreSQL:
#   ENGINE: django.db.backends.postgresql
#   NAME / USER / PASSWORD / HOST / PORT desde variables de entorno
if _get_env('POSTGRES_DB', default=''):
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _get_env('POSTGRES_DB', required=True),
        'USER': _get_env('POSTGRES_USER', required=True),
        'PASSWORD': _get_env('POSTGRES_PASSWORD', required=True),
        'HOST': _get_env('POSTGRES_HOST', default='127.0.0.1'),
        'PORT': _get_env('POSTGRES_PORT', default='5432'),
        'CONN_MAX_AGE': 60,
    }}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}


# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'clasificacion.authentication.MobileTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
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
STATIC_ROOT = BASE_DIR / 'staticfiles'


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

LOGIN_URL = '/login/'
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
CELERY_BROKER_URL = REDIS_URL or 'memory://'
CELERY_RESULT_BACKEND = REDIS_URL or 'cache+memory://'

# ─── Stripe ────────────────────────────────────────────────────────────────────
# Reemplaza estos valores con tus claves reales de https://dashboard.stripe.com/apikeys
# Modo TEST (empieza con sk_test_ / pk_test_) para pruebas sin cobro real.
STRIPE_SECRET_KEY      = _get_env('STRIPE_SECRET_KEY',      default='sk_test_REEMPLAZA_CON_TU_CLAVE')
STRIPE_PUBLISHABLE_KEY = _get_env('STRIPE_PUBLISHABLE_KEY', default='pk_test_REEMPLAZA_CON_TU_CLAVE')
STRIPE_PRICE_ID        = _get_env('STRIPE_PRICE_ID',        default='')   # ID del precio mensual en Stripe Dashboard
STRIPE_WEBHOOK_SECRET  = _get_env('STRIPE_WEBHOOK_SECRET',  default='')   # whsec_... del webhook configurado

if not DEBUG:
    if not ALLOWED_HOSTS:
        raise ValueError('DJANGO_ALLOWED_HOSTS es obligatorio en producción.')
    if not CORS_ALLOWED_ORIGINS:
        raise ValueError('CORS_ALLOWED_ORIGINS es obligatorio en producción.')
    if not EXTERNAL_API_KEY:
        raise ValueError('EXTERNAL_API_KEY es obligatorio en producción.')
    if not REDIS_URL:
        raise ValueError('REDIS_URL es obligatorio en producción.')
    if not _get_env('POSTGRES_DB', default=''):
        raise ValueError('POSTGRES_DB es obligatorio en producción.')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
