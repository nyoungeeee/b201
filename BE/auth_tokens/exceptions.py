from common.service_exceptions import BaseServiceError


class AuthServiceError(BaseServiceError):
    code = "AUTH_SERVICE_ERROR"
    message = "사용자 처리 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class UserAlreadyExistsError(AuthServiceError):
    code = "USER_ALREADY_EXISTS"
    message = "이미 존재하는 사용자입니다."


class UserNotFoundError(AuthServiceError):
    code = "USER_NOT_FOUND"
    message = "존재하지 않는 사용자입니다."


class UserBlockedError(AuthServiceError):
    code = "USER_BLOCKED"
    message = "차단된 사용자입니다."


class InvalidOrExpiredTokenError(AuthServiceError):
    code = "INVALID_OR_EXPIRED_TOKEN"
    message = "유효하지 않거나 만료된 토큰입니다."


class KakaoAPIError(AuthServiceError):
    code = "KAKAO_API_ERROR"
    message = "카카오 API 호출 중 오류가 발생했습니다."
