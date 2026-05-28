# B201 실행 방법

## 개발 서버

개발 서버는 `BE` 폴더의 Docker Compose를 사용합니다.
프론트엔드와 백엔드 서버는 실행하지 않고, PostgreSQL과 테스트 데이터 생성만 실행합니다.

### 1. `BE/.env` 생성

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
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

ACCESS_TOKEN_LIFETIME=30
REFRESH_TOKEN_LIFETIME=7

TIME_ZONE=Asia/Seoul
LANGUAGE_CODE=ko-kr

DJANGO_SETTINGS_MODULE=config.settings.local

KAKAO_REST_API_KEY=dev-kakao-rest-api-key
KAKAO_REDIRECT_URI=http://localhost:5173/
KAKAO_CLIENT_SECRET=dev-kakao-client-secret
```

### 2. 실행

```bash
cd BE
docker compose up
```

실행 서비스:

- `db`: PostgreSQL, 외부 포트 `5319`
- `seed_dummy_data`: 마이그레이션 및 테스트 데이터 생성 후 종료
- `pgadmin`: pgAdmin, 외부 포트 `5050`

## 운영 서버

운영 서버는 프로젝트 루트의 Docker Compose를 사용합니다.
프론트엔드는 빌드 후 nginx로 배포하고, 백엔드는 migrate 후 gunicorn으로 실행합니다.

### 1. 프로젝트 루트 `.env` 생성

```env
APP_ENV=prod
COMPOSE_PROFILES=prod

SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

DB_NAME=b201
DB_USER=b201
DB_PASSWORD=your-production-db-password
DB_HOST=db
DB_PORT=5432
DB_HOST_PORT=5432

FRONTEND_PORT=80

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com

ACCESS_TOKEN_LIFETIME=30
REFRESH_TOKEN_LIFETIME=7

TIME_ZONE=Asia/Seoul
LANGUAGE_CODE=ko-kr

DJANGO_SETTINGS_MODULE=config.settings.prod

KAKAO_REST_API_KEY=your-production-kakao-rest-api-key
KAKAO_REDIRECT_URI=https://your-domain.com/
KAKAO_CLIENT_SECRET=your-production-kakao-client-secret

ROOT_ADMIN_ID=your-root-admin-id
ROOT_ADMIN_PASSWORD=your-root-admin-password

VITE_API_BASE_URL=/api/v1
VITE_KAKAO_REST_API_KEY=your-production-kakao-rest-api-key
VITE_KAKAO_REDIRECT_URI=https://your-domain.com/
VITE_ACCESS_TOKEN_KEY=accessToken
VITE_REFRESH_TOKEN_KEY=refreshToken
VITE_AUTH_USER_KEY=authUser
```

### 2. 실행

```bash
docker compose up
```

실행 서비스:

- `db`: PostgreSQL, 외부 포트 `5432`
- `backend`: Django migrate 후 gunicorn 실행
- `frontend`: Vite 빌드 결과물을 nginx로 배포

nginx는 `/api/` 요청을 백엔드 컨테이너의 `http://backend:8000/api/`로 프록시합니다.
