from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite
    "http://127.0.0.1:5173",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
    }
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "EXCEPTION_HANDLER": "common.exception_handler.local_exception_handler",
}

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
