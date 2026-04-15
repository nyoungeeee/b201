from .local import *

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

KAKAO_REST_API_KEY = "test-key"
KAKAO_REDIRECT_URI = "http://localhost/test-callback"
KAKAO_CLIENT_SECRET = "test-secret"
