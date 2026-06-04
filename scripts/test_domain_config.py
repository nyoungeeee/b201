import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DockerBackendDeployConfigTestCase(unittest.TestCase):
    def test_compose_deploys_only_backend_runtime_services(self):
        compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")

        self.assertIn("backend:", compose)
        self.assertIn("db:", compose)
        self.assertNotIn("frontend:", compose)
        self.assertNotIn("frontend_admin:", compose)
        self.assertNotIn("b201-frontend", compose)
        self.assertNotIn("nginx", compose)
        self.assertIn("BACKEND_PORT", compose)

    def test_compose_keeps_backend_redirect_allowlist(self):
        compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")

        self.assertIn("KAKAO_REDIRECT_URIS:", compose)
        self.assertNotRegex(compose, r"(?m)^\s+KAKAO_REDIRECT_URI:")
        self.assertNotIn("VITE_", compose)

    def test_root_env_example_can_drive_compose(self):
        env_example = (ROOT / ".env.example").read_text(encoding="utf-8")

        required_values = (
            "B201_ENV_FILE=.env.example",
            "COMPOSE_PROFILES=prod",
            "ALLOWED_HOSTS=api.b201.kr",
            "KAKAO_REDIRECT_URIS=https://b201.kr/auth/kakao/callback,https://admin.b201.kr/auth/kakao/callback",
            "BACKEND_PORT=8000",
        )
        for value in required_values:
            with self.subTest(value=value):
                self.assertIn(value, env_example)

        self.assertNotIn("VITE_", env_example)


if __name__ == "__main__":
    unittest.main()
