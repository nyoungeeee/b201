# Unify Reservation APIs Design

## Goal

개인 예약과 팀 예약으로 분리된 사용자 예약 생성/조회 API를 옵션 기반 통합 API로 제공한다. 기존 분리 API는 프론트 전환 안정성을 위해 당장 제거하지 않고 호환 유지한다.

## Unified List API

- Method: `GET`
- Path: `/api/v1/reservations`
- Auth: 인증 필요
- Query:
  - `period`: `upcoming` 또는 `past`
  - `kind`: `single` 또는 `repeat`
  - `type`: `private` 또는 `team`
  - `status`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELED`
  - `team_id`: 팀 예약 필터
  - `page`: 기본값 `1`
  - `size`: 기본값 `20`
- Scope:
  - 개인 예약은 요청 사용자 본인 예약만 반환한다.
  - 팀 예약은 요청 사용자가 속한 활성 팀 예약만 반환한다.
  - `team_id`가 주어지면 해당 팀이 활성 상태인지와 사용자가 소속되어 있는지 검증한다.
- Period:
  - `upcoming`: 예약 종료 시간이 현재 시각 이후인 예약
  - `past`: 예약 종료 시간이 현재 시각 이전인 예약
- Response:
  - `period`
  - `reservations`
  - `pagination`

## Unified Create API

- Method: `POST`
- Path: `/api/v1/reservations/<room_id>`
- Auth: 인증 필요
- Body:
  - `type`: `private` 또는 `team`
  - `team_id`: `type=team`일 때 필수
  - `start_date`
  - `count`: 기본값 `1`
  - `start_time`
  - `end_time`
- Behavior:
  - `count=1`이면 단건 예약을 생성한다.
  - `count>1`이면 반복 예약을 생성한다.
  - 기존 개인/팀 예약 생성 서비스의 검증과 충돌 정책을 재사용한다.

## Unified Repeat Check API

- Method: `POST`
- Path: `/api/v1/reservations/<room_id>/repeat-check`
- Auth: 인증 필요
- Body:
  - `type`: `private` 또는 `team`
  - `team_id`: `type=team`일 때 필수
  - `start_date`
  - `count`
  - `start_time`
  - `end_time`
- Behavior:
  - 기존 개인/팀 반복 예약 가능 여부 확인 서비스를 재사용한다.

## Status Mapping

- 내부 DB 상태 `RESERVED`는 외부 API에서 `APPROVED`로 노출한다.
- 외부 API에서 `APPROVED`로 필터링하면 내부 `RESERVED`를 조회한다.
- `REJECTED`는 예약 모델 상태에 새로 추가한다.
- 기존 관리자 로직에서 쓰는 내부 `RESERVED` 이름은 유지한다.

## Reservation Item Response

각 예약 항목은 다음 필드를 반환한다.

- `reservation_number`
- `room_id`
- `room_name`
- `start_date`
- `start_time`
- `end_date`
- `end_time`
- `kind`
- `repeat_count`
- `conflict_count`
- `type`
- `team_id`
- `team_name`
- `color`
- `applicant_id`
- `applicant_name`
- `status`
- `created_at`

## Pagination

응답 pagination은 다음 필드를 반환한다.

- `page`
- `size`
- `total_count`
- `has_next`

## Tests

- 통합 조회 API가 개인 예약과 소속 팀 예약을 함께 반환한다.
- `type`, `kind`, `status`, `period`, `team_id` 필터가 적용된다.
- 통합 조회 응답이 요청 예시의 필드 구조를 만족한다.
- 통합 생성 API가 `type=private`로 개인 예약을 생성한다.
- 통합 생성 API가 `type=team`과 `team_id`로 팀 예약을 생성한다.
- 통합 반복 체크 API가 개인/팀 옵션을 처리한다.
- 기존 분리 API는 유지되어 기존 테스트가 계속 통과한다.
