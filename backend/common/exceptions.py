"""
backend/common/exceptions.py
Custom exception handlers and domain exceptions.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class ApplicationError(Exception):
    """Base application exception for domain logic failures."""
    def __init__(self, message="An internal error occurred", code=None):
        super().__init__(message)
        self.message = message
        self.code = code


class AuthorizationError(ApplicationError):
    """Raised when permission/authorization fails in service layer."""
    pass


class NotFoundError(ApplicationError):
    """Raised when a domain entity is not found."""
    pass


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, ApplicationError):
        return Response(
            {"success": False, "message": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return response
