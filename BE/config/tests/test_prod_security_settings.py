import os
from importlib import reload
from unittest.mock import patch

from django.test import SimpleTestCase

from config.settings import base, local, prod


class ProductionSecuritySettingsTestCase(SimpleTestCase):
    def test_cors_allow_all_origins_cannot_be_enabled_in_production(self):
        with patch.object(base, "CORS_ALLOW_ALL_ORIGINS", True):
            reloaded_prod = reload(prod)

        self.assertFalse(reloaded_prod.CORS_ALLOW_ALL_ORIGINS)


class LocalSecuritySettingsTestCase(SimpleTestCase):
    def test_csrf_trusted_origins_can_be_configured_for_local_frontends(self):
        origins = "http://localhost:5173,http://localhost:5174"

        with patch.dict(os.environ, {"CSRF_TRUSTED_ORIGINS": origins}):
            reloaded_local = reload(local)

        self.assertEqual(
            reloaded_local.CSRF_TRUSTED_ORIGINS,
            ["http://localhost:5173", "http://localhost:5174"],
        )
