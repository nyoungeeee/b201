class BaseServiceError(Exception):
    code = "SERVICE_ERROR"
    message = "서비스 처리 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)

    @classmethod
    def to_openapi_line(cls) -> str:
        return f"- {cls.code}: {cls.message}"
