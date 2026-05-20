from common.service_exceptions import BaseServiceError


class BackofficeServiceError(BaseServiceError):
    code = "BACKOFFICE_SERVICE_ERROR"
    message = "관리자 기능 처리 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        super().__init__(message=message, code=code)
