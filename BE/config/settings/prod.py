from .base import *

DEBUG = False

ALLOWED_HOSTS = ["be도메인.com"]  # 배포된 백엔드 도메인

CORS_ALLOWED_ORIGINS = [
    "https://fe도메인.com",  # 배포된 프론트엔드 도메인
]

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "EXCEPTION_HANDLER": "common.exception_handler.prod_exception_handler",
}

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
