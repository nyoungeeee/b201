from django.urls import path
from .views import (
    KakaoCallbackView,
    KakaoLoginView,
    LogoutView,
    TokenRefreshView,
    WithdrawView,
)

urlpatterns = [
    path("kakao/login", KakaoLoginView.as_view(), name="kakao_login"),
    path("kakao/callback", KakaoCallbackView.as_view(), name="kakao_callback"),
    path("refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout", LogoutView.as_view(), name="logout"),
    path("withdraw", WithdrawView.as_view(), name="withdraw"),
]
