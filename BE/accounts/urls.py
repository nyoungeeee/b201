from django.urls import path

from accounts.views import UserInfoView, UserNicknameCheckView

urlpatterns = [
    path("", UserInfoView.as_view(), name="user_info"),
    path(
        "nickname/check/",
        UserNicknameCheckView.as_view(),
        name="user_nickname_check",
    ),
]
