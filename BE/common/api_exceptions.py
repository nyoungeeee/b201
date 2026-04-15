from rest_framework.exceptions import APIException


class BaseAPIException(APIException):
    status_code = 400
    default_code = "BAD_REQUEST"
    default_detail = "잘못된 요청입니다."

    def __init__(self, code=None, message=None):
        detail = {
            "code": code or self.default_code,
            "message": message or self.default_detail,
        }
        super().__init__(detail=detail)


class BadRequestException(BaseAPIException):
    status_code = 400
    default_code = "BAD_REQUEST"
    default_detail = "잘못된 요청입니다."


class UnauthorizedException(BaseAPIException):
    status_code = 401
    default_code = "UNAUTHORIZED"
    default_detail = "인증이 필요합니다."


class ForbiddenException(BaseAPIException):
    status_code = 403
    default_code = "FORBIDDEN"
    default_detail = "접근 권한이 없습니다."


class NotFoundException(BaseAPIException):
    status_code = 404
    default_code = "NOT_FOUND"
    default_detail = "요청한 리소스를 찾을 수 없습니다."


class RequestTimeoutException(BaseAPIException):
    status_code = 408
    default_code = "REQUEST_TIMEOUT"
    default_detail = "요청 시간이 초과되었습니다."


class ConflictException(BaseAPIException):
    status_code = 409
    default_code = "CONFLICT"
    default_detail = "충돌이 발생했습니다."


class InternalServerErrorException(BaseAPIException):
    status_code = 500
    default_code = "INTERNAL_SERVER_ERROR"
    default_detail = "서버 오류가 발생했습니다."
