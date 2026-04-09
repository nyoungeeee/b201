from django.urls import path

from accounts.views import UserInfoView

urlpatterns = [
    path("", UserInfoView.as_view(), name="user_info"),
]
