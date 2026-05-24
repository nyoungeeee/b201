# Random Nickname API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비인증 랜덤 닉네임 API와 신규 가입 기본 닉네임 자동 부여를 구현한다.

**Architecture:** 닉네임 생성 규칙은 `accounts.services.UserInfoService`에 둔다. `accounts.views`는 API 응답만 담당하고, `auth_tokens.services.KakaoAuthService`는 신규 사용자 생성 시 같은 서비스를 호출한다.

**Tech Stack:** Django, Django REST Framework, drf-spectacular, unittest 기반 Django tests

---

### Task 1: Random Nickname API

**Files:**
- Modify: `BE/accounts/services.py`
- Modify: `BE/accounts/serializers.py`
- Modify: `BE/accounts/views.py`
- Modify: `BE/accounts/urls.py`
- Test: `BE/accounts/tests/test_random_nickname.py`

- [ ] **Step 1: Write the failing API and service tests**

Add tests for unauthenticated access, response shape, nickname policy, and duplicate retry.

- [ ] **Step 2: Run account random nickname tests and verify RED**

Run: `./venv/Scripts/python.exe manage.py test accounts.tests.test_random_nickname --noinput`

Expected: tests fail because the URL and service method do not exist yet.

- [ ] **Step 3: Implement minimal random nickname generation**

Add fixed prefix/noun pools, filter candidates to 8 characters or less with a one-digit suffix, retry duplicate candidates, expose a response serializer, view, and URL.

- [ ] **Step 4: Run account random nickname tests and verify GREEN**

Run: `./venv/Scripts/python.exe manage.py test accounts.tests.test_random_nickname --noinput`

Expected: tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add random nickname api`

### Task 2: Signup Default Nickname

**Files:**
- Modify: `BE/auth_tokens/services.py`
- Test: `BE/auth_tokens/tests/test_auth_signin.py`

- [ ] **Step 1: Write the failing signup test**

Add a test proving a newly created Kakao user receives a non-null nickname from the random nickname service.

- [ ] **Step 2: Run signin tests and verify RED**

Run: `./venv/Scripts/python.exe manage.py test auth_tokens.tests.test_auth_signin --noinput`

Expected: the new test fails because new users are created without a nickname.

- [ ] **Step 3: Wire signup to random nickname generation**

Generate a nickname before `User.objects.create_user(...)` and pass it as `nickname`.

- [ ] **Step 4: Run signin tests and verify GREEN**

Run: `./venv/Scripts/python.exe manage.py test auth_tokens.tests.test_auth_signin --noinput`

Expected: tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: assign random nickname on signup`

### Task 3: Final Verification

**Files:**
- Verify all modified backend files.

- [ ] **Step 1: Run Django checks**

Run: `./venv/Scripts/python.exe manage.py check`

Expected: no system check issues.

- [ ] **Step 2: Run focused backend tests**

Run: `./venv/Scripts/python.exe manage.py test accounts.tests.test_random_nickname auth_tokens.tests.test_auth_signin --noinput`

Expected: tests pass.

- [ ] **Step 3: Run formatting check**

Run: `./venv/Scripts/python.exe -m black --check accounts auth_tokens`

Expected: formatting check passes.
