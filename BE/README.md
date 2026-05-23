# Backend (Django)

## 개요

이 프로젝트의 백엔드는 Django 기반의 API 서버로 구성되어 있습니다.

* Django
* Django REST Framework (DRF)
* JWT 인증 (Simple JWT)
* Swagger (drf-spectacular)
* PostgreSQL (Docker)

프론트엔드(React)와 분리된 구조로 동작합니다.

---

## 폴더 구조

```text
BE/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── local.py
│   │   └── prod.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── manage.py
├── requirements.txt
└── README.md
```

* `config/`: Django 설정 및 진입점
* `settings/`: 환경별 설정 분리 (base / local / prod)
* `manage.py`: Django 관리 명령어
* `requirements.txt`: Python 패키지 목록

---

## 개발 환경 설정

### 1. 가상환경 생성 및 
Python버전 3.13

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### 2. 패키지 설치

```bash
pip install -r requirements.txt
```

---

## Docker로 백엔드 실행

백엔드 API 서버와 PostgreSQL을 함께 실행할 수 있습니다. 별도 `.env`가 없어도 개발용 기본값으로 동작하며, 필요한 경우 아래 환경 변수를 `.env`에 넣어 덮어쓸 수 있습니다.

`web` 컨테이너가 시작될 때마다 개발 DB의 `public` schema를 삭제한 뒤 다시 생성하고, migration과 테스트용 더미 데이터 생성을 자동으로 실행합니다. 따라서 `docker compose up`을 다시 실행하면 항상 초기화된 테스트 데이터가 들어간 상태로 서버가 뜹니다.

### 1. 백엔드 + DB 실행

```bash
docker compose up -d
```

* API 서버: `http://localhost:8000`
* Swagger UI: `http://localhost:8000/api/docs/`
* PostgreSQL: `localhost:5432`
* pgAdmin: `http://localhost:5050`
* 시작 시 자동 실행: DB schema 초기화 → migration → `seed_test_dummy_data`

Windows에서 `8000` 포트가 예약되어 있으면 다음처럼 다른 포트로 실행할 수 있습니다.

```powershell
$env:BACKEND_PORT="8500"
docker compose up -d
```

이 경우 API 서버와 Swagger UI는 각각 `http://localhost:8500`, `http://localhost:8500/api/docs/`에서 확인합니다.

### 2. 로그 확인

```bash
docker compose logs -f web
```

### 3. 서버 중지

```bash
docker compose down
```

### 4. DB 볼륨까지 삭제하고 완전 초기화

```bash
docker compose down -v
```

일반적으로는 `docker compose up -d`만 다시 실행해도 데이터가 초기화됩니다. Docker volume 자체까지 삭제하고 싶을 때만 `down -v`를 사용하세요.

### Docker 기본 설정 (.env 선택)

```env
DB_NAME=b201
DB_USER=b201
DB_PASSWORD=b201_password
DB_HOST=127.0.0.1
DB_PORT=5432
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
SECRET_KEY=secret-key-for-dev-only
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOW_ALL_ORIGINS=True
```

---

## 테스트용 더미 데이터

개발/테스트 화면 확인용 사용자, 팀, 합주실, 쉬는날, 예약 데이터를 생성하는 Django management command가 있습니다.

### Docker에서 수동 실행

기본 Docker 실행은 자동으로 더미 데이터를 생성합니다. 서버 실행과 별도로 더미 데이터를 다시 만들고 싶으면 다음 명령을 사용하세요. 이 명령도 기존 DB schema를 삭제한 뒤 migration과 seed를 다시 실행합니다.

```bash
docker compose run --rm seed_dummy_data
```

기간이나 생성 규모를 줄여 빠르게 확인할 수도 있습니다. 이미 `web` 컨테이너가 실행 중이라면 아래처럼 컨테이너 안에서 seed 명령만 다시 실행합니다.

```bash
docker compose exec web python manage.py seed_test_dummy_data --user-count 20 --team-count 4 --team-member-count 12 --start-date 2026-06-01 --end-date 2026-06-14
```

예약 없이 사용자/팀/합주실/쉬는날만 생성하려면 다음을 사용합니다.

```bash
docker compose exec web python manage.py seed_test_dummy_data --skip-reservations
```

명령 실행이 끝나면 샘플 관리자/일반 사용자 access token이 출력됩니다. Swagger나 프론트에서 테스트할 때 `Authorization: Bearer <access>` 형식으로 사용할 수 있습니다.

### 로컬 가상환경에서 실행

```bash
python manage.py migrate
python manage.py seed_test_dummy_data
```

기본 생성 범위는 `2026-06-01`부터 `2026-12-31`까지입니다. 로컬 가상환경에서 실행하는 명령은 기존 데이터를 자동 삭제하지 않습니다. 로컬에서도 초기화가 필요하면 DB를 직접 비우거나 Docker 실행 흐름을 사용하세요.

---

## 데이터베이스 (PostgreSQL)

PostgreSQL만 Docker로 실행할 수도 있습니다. 백엔드까지 Docker로 실행하려면 위의 "Docker로 백엔드 실행" 섹션을 사용하세요.

### DB만 실행

```bash
docker compose up -d db
```

### 기본 설정 (.env)

```env
DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=app_password
DB_HOST=127.0.0.1
DB_PORT=5432
```

---

## 환경 변수 (.env)

```env
SECRET_KEY="your-secret-key"
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=app_password
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOW_ALL_ORIGINS=True

ACCESS_TOKEN_LIFETIME=30
REFRESH_TOKEN_LIFETIME=7
```



---

## 실행 방법

### 마이그레이션

```bash
python manage.py migrate
```

### 관리자 계정 생성

```bash
python manage.py createsuperuser
```

### 서버 실행

```bash
python manage.py runserver
```

---

## API 문서 (Swagger)

Swagger UI:

```text
http://localhost:8000/api/docs/
```

* `/api/schema/` : OpenAPI 스키마
* `/api/docs/` : Swagger UI

---

## 인증 (JWT)

JWT 기반 인증을 사용합니다.

### 토큰 발급

```text
POST /api/token/
```

### 토큰 갱신

```text
POST /api/token/refresh/
```

### 요청 헤더

```text
Authorization: Bearer <access_token>
```

---

## CORS 설정

프론트엔드와 분리되어 있으므로 CORS 설정이 필요합니다.

개발 환경에서는 다음을 사용합니다.

```python
CORS_ALLOW_ALL_ORIGINS = True
```

---

## 정적 파일 (Static)

정적 파일은 다음과 같이 처리합니다.

* 개발: Django 처리
* 배포: Nginx에서 직접 서빙

배포 전:

```bash
python manage.py collectstatic
```

---

## 코드 스타일 및 테스트

### Black (포맷터)

```bash
black .
black . --check
```

### 테스트

```bash
python manage.py test --parallel 4
```

---

## CI (GitHub Actions)

Backend CI는 다음 작업을 수행합니다.

* Black 검사
* Django check
* 테스트 실행

BE 폴더 변경 시에만 실행됩니다.

---

## 주의 사항

* 운영 환경에서는 `DEBUG=False`로 설정해야 합니다.
* PostgreSQL 연결 정보는 환경 변수로 관리합니다.

---
