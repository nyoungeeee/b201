from django.urls import path

from .views import TestSigninView

urlpatterns = [
    path("signin/", TestSigninView.as_view()),
]
