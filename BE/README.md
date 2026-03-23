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

## 데이터베이스 (PostgreSQL)

PostgreSQL은 Docker로 실행합니다.

### 실행

```bash
docker compose up -d
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
