from common.service_exceptions import BaseServiceError


class UserAuthServiceError(BaseServiceError):
    code = "AUTH_SERVICE_ERROR"
    message = "사용자 처리 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class UserNotFoundError(UserAuthServiceError):
    code = "USER_NOT_FOUND"
    message = "사용자를 찾을 수 없습니다.(탈퇴, 혹은 차단된 사용자)"


class NicknameAlreadyExistsError(UserAuthServiceError):
    code = "NICKNAME_ALREADY_EXISTS"
    message = "이미 존재하는 닉네임입니다."


class RandomNicknameGenerationError(UserAuthServiceError):
    code = "RANDOM_NICKNAME_GENERATION_FAILED"
    message = "랜덤 닉네임 생성에 실패했습니다."
