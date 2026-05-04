from common.service_exceptions import BaseServiceError


class TeamServiceError(BaseServiceError):
    code = "TEAM_SERVICE_ERROR"
    message = "팀 서비스 중 오류가 발생했습니다."

    def __init__(self, message=None, code=None):
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class NotFoundTeamError(TeamServiceError):
    code = "NOT_FOUND_TEAM"
    message = "팀 정보를 찾을 수 없습니다."


class ForbiddenTeamAccessError(TeamServiceError):
    code = "FORBIDDEN_TEAM_ACCESS"
    message = "해당 팀에 접근할 권한이 없습니다."


class DuplicatedTeamNameError(TeamServiceError):
    code = "DUPLICATED_TEAM_NAME"
    message = "이미 존재하는 팀 이름입니다."
