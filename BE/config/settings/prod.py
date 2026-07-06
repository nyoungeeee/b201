from .base import *


def env_list(name):
    return [value.strip() for value in os.getenv(name, "").split(",") if value.strip()]


DEBUG = False

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS")

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True") == "True"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True") == "True"

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("DJANGO_CACHE_URL", "redis://redis:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "EXCEPTION_HANDLER": "common.exception_handler.prod_exception_handler",
}

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")
KAKAO_REDIRECT_URIS = [KAKAO_REDIRECT_URI] if KAKAO_REDIRECT_URI else []
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")

USER_FRONTEND_URL = os.getenv("USER_FRONTEND_URL")
ADMIN_FRONTEND_URL = os.getenv("ADMIN_FRONTEND_URL")
