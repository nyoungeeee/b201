from typing import Type

from drf_spectacular.utils import OpenApiResponse

from common.service_exceptions import BaseServiceError


def openapi_exception_response(
    *errors: Type[BaseServiceError],
    description: str = "",
) -> OpenApiResponse:
    error_lines = "\n".join(error.to_openapi_line() for error in errors)

    full_description = description.strip()
    if error_lines:
        full_description = (
            f"{full_description}\n\n오류 목록:\n{error_lines}"
            if full_description
            else f"오류 목록:\n{error_lines}"
        )

    return OpenApiResponse(
        description=full_description,
    )
