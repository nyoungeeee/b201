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
