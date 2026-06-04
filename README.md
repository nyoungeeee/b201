# B201 실행 및 배포

## 서비스 도메인

운영 환경은 프런트와 백엔드를 분리해서 배포합니다. 이 저장소의 루트 Docker Compose는 PostgreSQL과 Django 백엔드만 실행합니다.

| 도메인 | 서비스 | 공개 경로 |
| --- | --- | --- |
| `b201.kr` | 사용자 React 앱 (`FE`) | 사용자 화면, 기존 `/admin`은 React 404 |
| `admin.b201.kr` | 관리자 React 앱 (`FE_ADMIN`) | 관리자 로그인 및 관리 화면 |
| `api.b201.kr` | Django API (`BE`) | `/v1/*`, `/docs/`, `/schema/`, `/redoc/` |

DNS, TLS 인증서, 프런트 정적 파일 호스팅, 외부 Nginx 또는 로드밸런서 설정은 운영 인프라에서 별도로 적용해야 합니다.

## 개발 환경

PostgreSQL과 테스트 데이터는 `BE`의 Compose를 사용합니다.

```env
SECRET_KEY=dev-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost,0.0.0.0

DB_NAME=b201
DB_USER=b201
DB_PASSWORD=b201_password
DB_HOST=localhost
DB_PORT=5319

CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

ACCESS_TOKEN_LIFETIME=30
REFRESH_TOKEN_LIFETIME=7
TIME_ZONE=Asia/Seoul
LANGUAGE_CODE=ko-kr
DJANGO_SETTINGS_MODULE=config.settings.local

KAKAO_REST_API_KEY=dev-kakao-rest-api-key
KAKAO_REDIRECT_URIS=http://localhost:5173/auth/kakao/callback,http://localhost:5174/auth/kakao/callback
KAKAO_CLIENT_SECRET=dev-kakao-client-secret
```

```bash
cd BE
docker compose up
```

사용자 앱과 관리자 앱은 각각 실행합니다.

```bash
cd FE
npm ci
npm run dev
```

```bash
cd FE_ADMIN
npm ci
npm run dev -- --port 5174
```

## 운영 환경

프로젝트 루트의 `.env.example`을 복사한 뒤 모든 `CHANGE_ME` 값을 교체합니다.

```bash
cp .env.example .env
```

`.env.example` 자체로 Compose 설정을 확인할 수도 있습니다.

```bash
docker compose --env-file .env.example config --quiet
```

주요 운영 환경값:

```env
APP_ENV=prod
COMPOSE_PROFILES=prod

SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=api.b201.kr

DB_NAME=b201
DB_USER=b201
DB_PASSWORD=your-production-db-password
DB_HOST=db
DB_PORT=5432
DB_HOST_PORT=5319

BACKEND_PORT=8000

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://b201.kr,https://admin.b201.kr
CSRF_TRUSTED_ORIGINS=https://b201.kr,https://admin.b201.kr,https://api.b201.kr

ACCESS_TOKEN_LIFETIME=30
REFRESH_TOKEN_LIFETIME=7
TIME_ZONE=Asia/Seoul
LANGUAGE_CODE=ko-kr
DJANGO_SETTINGS_MODULE=config.settings.prod

KAKAO_REST_API_KEY=your-production-kakao-rest-api-key
KAKAO_REDIRECT_URIS=https://b201.kr/auth/kakao/callback,https://admin.b201.kr/auth/kakao/callback
KAKAO_CLIENT_SECRET=your-kakao-client-secret

ROOT_ADMIN_ID=your-root-admin-id
ROOT_ADMIN_PASSWORD=your-root-admin-password
```

실행:

```bash
docker compose up -d
```

서비스 구성:

- `backend`: Django API와 Swagger
- `db`: PostgreSQL

루트 Compose는 프런트 이미지나 Nginx 게이트웨이를 만들지 않습니다. `FE`와 `FE_ADMIN`은 별도 프런트 배포 파이프라인에서 빌드하고, 운영 Nginx는 `api.b201.kr` 요청만 백엔드 컨테이너의 `BACKEND_PORT`로 프록시하도록 구성합니다.

## 검증

```bash
python scripts/test_domain_config.py
docker compose config --quiet
```

```bash
cd FE
npm test
npm run lint
npm run build
```

```bash
cd FE_ADMIN
npm test
npm run lint
npm run build
```

```bash
cd BE
python manage.py test
```

## GitHub Actions 환경변수

사용자 FE 배포에는 `VITE_API_BASE_URL`, `VITE_ADMIN_BASE_URL`, `VITE_KAKAO_REST_API_KEY`, `VITE_USER_KAKAO_REDIRECT_URI`가 필요합니다.

관리자 FE 배포에는 `VITE_API_BASE_URL`, `VITE_USER_BASE_URL`, `VITE_KAKAO_REST_API_KEY`, `VITE_ADMIN_KAKAO_REDIRECT_URI`가 필요합니다.
