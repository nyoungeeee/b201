from django.urls import path

from .views import TestSigninView

urlpatterns = [
    path("auth/signin/", TestSigninView.as_view()),
]
