"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path, include

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from django.http import HttpResponse

from django.conf import settings

# API root view
urlpatterns = [
    path(
        "",
        lambda request: HttpResponse(
            status=200, headers={"Content-Type": "application/json"}
        ),
    )
]

# API schema and documentation
urlpatterns += [
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

# JWT auth
urlpatterns += [
    path("auth/", include("auth_tokens.urls")),
    path("v1/me/", include("accounts.urls")),
    path("v1/rooms/", include("bookings.rooms_urls")),
    path("v1/reservations/", include("bookings.reservations_urls")),
    path("v1/teams/", include("teams.urls")),
    path("v1/admin/", include("backoffice.urls")),
]


if settings.DEBUG:
    urlpatterns += [path("v1/test/", include("test_server.urls"))]
