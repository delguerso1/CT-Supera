"""
Configurações de produção para Hostinger
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Configuração de hosts permitidos para produção
ALLOWED_HOSTS = [
    os.getenv('DOMAIN_NAME', 'ctsupera.com.br'),
    'www.ctsupera.com.br',
    os.getenv('SERVER_IP', '72.60.145.13'),
    'localhost',
    '127.0.0.1',
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'usuarios',
    'alunos',
    'turmas',
    'ct',
    'funcionarios',
    'financeiro',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Para servir arquivos estáticos
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configurações de CORS para produção
CORS_ALLOWED_ORIGINS = [
    f"https://{os.getenv('DOMAIN_NAME', 'ctsupera.com.br')}",
    f"http://{os.getenv('DOMAIN_NAME', 'ctsupera.com.br')}",
    "https://www.ctsupera.com.br",
    "http://www.ctsupera.com.br",
]

# ⚠️ IMPORTANTE: Em produção, NUNCA use CORS_ALLOW_ALL_ORIGINS = True
# Isso é uma vulnerabilidade de segurança crítica!
# CORS_ALLOW_ALL_ORIGINS = False  # Padrão seguro

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Configurações de segurança para produção
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True').lower() == 'true'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# Configurações de CSRF para produção
CSRF_TRUSTED_ORIGINS = [
    f"https://{os.getenv('DOMAIN_NAME', 'ctsupera.com.br')}",
    "https://www.ctsupera.com.br",
    f"http://{os.getenv('DOMAIN_NAME', 'ctsupera.com.br')}",  # Apenas se não estiver usando SSL
    "http://www.ctsupera.com.br",  # Apenas se não estiver usando SSL
]

# Configurações do REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

ROOT_URLCONF = 'app.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.static',
            ],
        },
    },
]

WSGI_APPLICATION = 'app.wsgi.application'

# Configuração do banco de dados PostgreSQL (Hostinger)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB_NAME', 'ctsupera'),
        'USER': os.getenv('POSTGRES_DB_USER', 'ctsupera'),
        'PASSWORD': os.getenv('POSTGRES_DB_PASSWORD', ''),
        'HOST': os.getenv('POSTGRES_DB_HOST', 'localhost'),
        'PORT': os.getenv('POSTGRES_DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuração do WhiteNoise para servir arquivos estáticos
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configurações de usuário customizado
AUTH_USER_MODEL = 'usuarios.Usuario'

# Configurações de autenticação
LOGIN_URL = '/usuarios/login/'
LOGOUT_REDIRECT_URL = '/usuarios/login/'

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# Handler de erro 404
HANDLER404 = "usuarios.views.error_404"

# Configurações de e-mail para produção
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'administracao@ctsupera.com.br')

# URL do frontend para links de ativação
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://ctsupera.com.br')

# Configurações de pagamento (removido)
# PAYMENT_ACCESS_TOKEN = os.getenv('PAYMENT_ACCESS_TOKEN', '')
# PAYMENT_PUBLIC_KEY = os.getenv('PAYMENT_PUBLIC_KEY', '')

# Configurações do C6 Bank (valores devem vir do arquivo .env)
C6_BANK_ENVIRONMENT = os.getenv('C6_BANK_ENVIRONMENT', 'sandbox').lower()  # sandbox ou production

# Seleciona as configurações baseadas no ambiente
if C6_BANK_ENVIRONMENT == 'production':
    C6_BANK_CLIENT_ID = os.getenv('C6_BANK_PRODUCTION_CLIENT_ID')
    C6_BANK_CLIENT_SECRET = os.getenv('C6_BANK_PRODUCTION_CLIENT_SECRET')
    C6_BANK_CHAVE_PIX = os.getenv('C6_BANK_PRODUCTION_CHAVE_PIX')
    C6_BANK_CERT_PATH = os.getenv('C6_BANK_PRODUCTION_CERT_PATH', 'certificados/Producao/cert.crt')
    C6_BANK_KEY_PATH = os.getenv('C6_BANK_PRODUCTION_KEY_PATH', 'certificados/Producao/cert.key')
    C6_BANK_BASE_URL = os.getenv('C6_BANK_PRODUCTION_URL', 'https://baas-api.c6bank.info')
else:  # sandbox (padrão)
    C6_BANK_CLIENT_ID = os.getenv('C6_BANK_SANDBOX_CLIENT_ID')
    C6_BANK_CLIENT_SECRET = os.getenv('C6_BANK_SANDBOX_CLIENT_SECRET')
    C6_BANK_CHAVE_PIX = os.getenv('C6_BANK_SANDBOX_CHAVE_PIX')
    C6_BANK_CERT_PATH = os.getenv('C6_BANK_SANDBOX_CERT_PATH', 'certificados/Sandbox/certificado.crt')
    C6_BANK_KEY_PATH = os.getenv('C6_BANK_SANDBOX_KEY_PATH', 'certificados/Sandbox/chave.key')
    C6_BANK_BASE_URL = os.getenv('C6_BANK_SANDBOX_URL', 'https://baas-api-sandbox.c6bank.info')

# URLs mantidas para compatibilidade
C6_BANK_SANDBOX_URL = os.getenv('C6_BANK_SANDBOX_URL', 'https://baas-api-sandbox.c6bank.info')
C6_BANK_PRODUCTION_URL = os.getenv('C6_BANK_PRODUCTION_URL', 'https://baas-api.c6bank.info')

# Configurações de logging para produção
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
