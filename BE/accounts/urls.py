from django.urls import path

from accounts.views import (
    CalendarSubscriptionIssueView,
    RandomNicknameView,
    UserInfoView,
    UserNicknameCheckView,
)

urlpatterns = [
    path("", UserInfoView.as_view(), name="user_info"),
    path(
        "nickname/check/",
        UserNicknameCheckView.as_view(),
        name="user_nickname_check",
    ),
    path(
        "nickname/random/",
        RandomNicknameView.as_view(),
        name="user_nickname_random",
    ),
    path(
        "calendar-subscription/",
        CalendarSubscriptionIssueView.as_view(),
        name="calendar-subscription-issue",
    ),
]
