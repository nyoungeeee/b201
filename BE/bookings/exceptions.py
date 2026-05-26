from common.service_exceptions import BaseServiceError


class BookingCheckServiceError(BaseServiceError):
    code = "BOOKING_CHECK_SERVICE_ERROR"
    message = "예약 일정 조회 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class NotFoundStudioRoomError(BookingCheckServiceError):
    code = "NOT_FOUND_STUDIO_ROOM"
    message = "해당 ID의 스튜디오 룸을 찾을 수 없습니다."


class InvalidDateFormatError(BookingCheckServiceError):
    code = "INVALID_DATE_FORMAT"
    message = "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식이어야 합니다."


class NotFoundBookingError(BookingCheckServiceError):
    code = "NOT_FOUND_BOOKING"
    message = "예약 정보를 찾을 수 없습니다."


class NotFoundTeamError(BookingCheckServiceError):
    code = "NOT_FOUND_TEAM"
    message = "팀 정보를 찾을 수 없습니다."


class ForbiddenTeamBookingError(BookingCheckServiceError):
    code = "FORBIDDEN_TEAM_BOOKING"
    message = "해당 팀 예약에 접근할 수 없습니다."


class DuplicatedReservationError(BookingCheckServiceError):
    code = "DUPLICATED_RESERVATION"
    message = "이미 예약된 시간입니다."


class NoAvailableRepeatDatesError(BookingCheckServiceError):
    code = "NO_AVAILABLE_REPEAT_DATES"
    message = "예약 가능한 반복 날짜가 없습니다."


class AlreadyCanceledReservationError(BookingCheckServiceError):
    code = "ALREADY_CANCELED"
    message = "이미 취소된 예약입니다."


class NotRepeatReservationError(BookingCheckServiceError):
    code = "NOT_REPEAT_RESERVATION"
    message = "반복 예약이 아닙니다."


class NotFoundRepeatOccurrenceError(BookingCheckServiceError):
    code = "NOT_FOUND_REPEAT_OCCURRENCE"
    message = "해당 날짜의 반복 예약 회차를 찾을 수 없습니다."


class InvalidBookingTimeError(BookingCheckServiceError):
    code = "INVALID_BOOKING_TIME"
    message = "예약 시간이 올바르지 않습니다."


class OutsideOperatingHoursError(BookingCheckServiceError):
    code = "OUTSIDE_OPERATING_HOURS"
    message = "운영 시간 내에서만 예약할 수 있습니다."


class InactiveStudioRoomError(BookingCheckServiceError):
    code = "INACTIVE_STUDIO_ROOM"
    message = "비활성화된 스튜디오 룸입니다."
