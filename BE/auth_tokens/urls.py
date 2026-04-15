from django.urls import path
from .views import LogoutView, SigninView, TokenRefreshView, WithdrawView

urlpatterns = [
    path("signin", SigninView.as_view(), name="signin"),
    path("logout", LogoutView.as_view(), name="logout"),
    path("withdraw", WithdrawView.as_view(), name="withdraw"),
    path("token/refresh", TokenRefreshView.as_view(), name="token_refresh"),
]
