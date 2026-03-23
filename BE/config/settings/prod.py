from .base import *

DEBUG = False

ALLOWED_HOSTS = ["be도메인.com"]  # 배포된 백엔드 도메인

CORS_ALLOWED_ORIGINS = [
    "https://fe도메인.com",  # 배포된 프론트엔드 도메인
]
