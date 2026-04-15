from rest_framework.views import exception_handler


def local_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    if isinstance(response.data, dict):
        if "code" in response.data and "message" in response.data:
            return response

        # DRF 기본 APIException
        if "detail" in response.data:
            response.data = {
                "code": getattr(exc, "default_code", "ERROR"),
                "message": response.data["detail"],
            }
            return response

    # serializer 필드 에러 처리
    response.data = {
        "code": "INVALID_INPUT",
        "message": "요청값 오류",
        "errors": response.data,
    }
    return response


def prod_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    if 400 <= response.status_code < 500:
        response.data = {
            "code": "BAD_REQUEST",
            "message": "잘못된 요청입니다.",
        }
    else:
        response.data = {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "서버 오류가 발생했습니다.",
        }

    return response
