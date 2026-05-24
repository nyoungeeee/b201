# Unify Reservation APIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인/팀 예약 생성, 반복 확인, 조회 API를 옵션 기반 통합 엔드포인트로 추가한다.

**Architecture:** 기존 `ReservationCommandService`의 개인/팀 생성 메서드는 유지하고, 통합 view가 `type`과 `count`에 따라 기존 메서드를 호출한다. 조회는 `ReservationQueryService.get_reservations`를 새로 추가해 개인 예약과 소속 팀 예약을 하나의 queryset으로 합치고 공통 응답 serializer로 직렬화한다.

**Tech Stack:** Django, Django REST Framework, Django ORM, unittest 기반 Django tests

---

### Task 1: Status and Response Shape

**Files:**
- Modify: `BE/bookings/models.py`
- Create: `BE/bookings/migrations/0003_add_rejected_booking_status.py`
- Modify: `BE/bookings/services.py`
- Modify: `BE/bookings/serializers.py`
- Test: `BE/bookings/tests/test_reservation_list_unified.py`

- [ ] **Step 1: Write failing tests**

Add tests proving `GET /api/v1/reservations` returns `period`, `reservations`, `pagination`, maps internal `RESERVED` to external `APPROVED`, includes `REJECTED`, and returns the requested reservation item fields.

- [ ] **Step 2: Run RED**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_list_unified --noinput`

Expected: fail because the URL does not exist.

- [ ] **Step 3: Implement status mapping and serializers**

Add `REJECTED` to `BookingStatus`, create migration, add unified reservation item/list serializers, and map external status values in service helpers.

- [ ] **Step 4: Run GREEN**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_list_unified --noinput`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `feat: 예약 조회 응답 형식 통합`

### Task 2: Unified Query Filters

**Files:**
- Modify: `BE/bookings/services.py`
- Modify: `BE/bookings/serializers.py`
- Modify: `BE/bookings/views.py`
- Modify: `BE/bookings/reservations_urls.py`
- Test: `BE/bookings/tests/test_reservation_list_unified.py`

- [ ] **Step 1: Write failing filter tests**

Add tests for `period=upcoming`, `period=past`, `type=private`, `type=team`, `kind=single`, `kind=repeat`, `status=APPROVED`, `status=REJECTED`, `team_id`, and pagination metadata.

- [ ] **Step 2: Run RED**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_list_unified --noinput`

Expected: fail on missing filter behavior.

- [ ] **Step 3: Implement query filters**

Build a combined queryset scoped to `Q(user=user, booking_type=PRIVATE) | Q(booking_type=TEAM, team_id__in=allowed_team_ids)`, apply filters, count total, slice page, and build response items.

- [ ] **Step 4: Run GREEN**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_list_unified --noinput`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `feat: 예약 조회 필터 통합`

### Task 3: Unified Create and Repeat Check

**Files:**
- Modify: `BE/bookings/serializers.py`
- Modify: `BE/bookings/views.py`
- Modify: `BE/bookings/reservations_urls.py`
- Test: `BE/bookings/tests/test_reservation_create_unified.py`

- [ ] **Step 1: Write failing create tests**

Add tests for `POST /api/v1/reservations/<room_id>` with `type=private`, `type=team`, missing `team_id`, and `count>1`.

- [ ] **Step 2: Write failing repeat-check tests**

Add tests for `POST /api/v1/reservations/<room_id>/repeat-check` with `type=private` and `type=team`.

- [ ] **Step 3: Run RED**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_create_unified --noinput`

Expected: fail because unified create URLs do not exist.

- [ ] **Step 4: Implement unified create views**

Route by `type` and `count`, reuse existing command service methods, and return the unified create response shape.

- [ ] **Step 5: Run GREEN**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_create_unified --noinput`

Expected: pass.

- [ ] **Step 6: Commit**

Commit message: `feat: 예약 생성 API 통합`

### Task 4: Final Verification

**Files:**
- Verify backend booking changes.

- [ ] **Step 1: Run Django checks**

Run: `./venv/Scripts/python.exe manage.py check`

Expected: no system check issues.

- [ ] **Step 2: Run focused booking tests**

Run: `./venv/Scripts/python.exe manage.py test bookings.tests.test_reservation_list_unified bookings.tests.test_reservation_create_unified bookings.tests.test_reservation_list_my bookings.tests.test_reservation_list_team bookings.tests.test_reservation_private bookings.tests.test_reservation_team --noinput`

Expected: all tests pass.

- [ ] **Step 3: Run formatting check**

Run: `./venv/Scripts/python.exe -m black --check bookings`

Expected: formatting check passes.
