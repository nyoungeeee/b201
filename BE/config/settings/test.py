from .local import *

SECRET_KEY = "test-secret-key-for-jwt-signing-with-at-least-32-bytes"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

KAKAO_REST_API_KEY = "test-key"
KAKAO_REDIRECT_URI = "https://api.b201.kr/auth/kakao/callback"
KAKAO_REDIRECT_URIS = [KAKAO_REDIRECT_URI]
KAKAO_CLIENT_SECRET = "test-secret"
USER_FRONTEND_URL = "https://b201.kr"
ADMIN_FRONTEND_URL = "https://admin.b201.kr"
JWT_ACCESS_COOKIE_NAME = "access_token"
JWT_REFRESH_COOKIE_NAME = "refresh_token"
JWT_COOKIE_SECURE = True
JWT_COOKIE_HTTPONLY = True
JWT_COOKIE_SAMESITE = "None"
