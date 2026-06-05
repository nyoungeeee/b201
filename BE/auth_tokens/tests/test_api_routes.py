from django.conf import settings
from django.test import SimpleTestCase
from django.urls import Resolver404, resolve


class PublicAPIRouteTestCase(SimpleTestCase):
    def test_new_public_api_routes_resolve(self):
        self.assertEqual(resolve("/auth/kakao/login").url_name, "kakao_login")
        self.assertEqual(resolve("/auth/kakao/callback").url_name, "kakao_callback")
        self.assertEqual(resolve("/auth/refresh").url_name, "token_refresh")
        self.assertEqual(resolve("/auth/logout").url_name, "logout")
        self.assertEqual(resolve("/docs/").url_name, "swagger-ui")
        self.assertEqual(resolve("/schema/").url_name, "schema")
        self.assertEqual(resolve("/redoc/").url_name, "redoc")

    def test_legacy_api_routes_do_not_resolve(self):
        for path in (
            "/api/v1/auth/signin",
            "/v1/auth/signin",
            "/v1/auth/token/refresh",
            "/api/docs/",
            "/api/schema/",
            "/api/redoc/",
            "/api/admin/",
        ):
            with self.subTest(path=path):
                with self.assertRaises(Resolver404):
                    resolve(path)

    def test_openapi_schema_uses_new_public_api_prefix(self):
        spectacular_settings = settings.SPECTACULAR_SETTINGS

        self.assertEqual(spectacular_settings["SCHEMA_PATH_PREFIX"], r"/v[0-9]|/auth")
        self.assertEqual(spectacular_settings["SERVERS"][0]["url"], "/")
