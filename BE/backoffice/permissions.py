from rest_framework.permissions import BasePermission


class IsStaffAdmin(BasePermission):
    message = "관리자 권한이 없습니다."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )
