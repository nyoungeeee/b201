from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if raw_token is not None:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        return None


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "auth_tokens.authentication.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.JWT_ACCESS_COOKIE_NAME,
        }
