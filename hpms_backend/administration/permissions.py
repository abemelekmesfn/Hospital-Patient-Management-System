from rest_framework.permissions import BasePermission


class IsAuthenticatedAdmin(BasePermission):
    """Only active users with the ADMIN role may access admin APIs."""

    message = "Admin authentication required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "role", None) == "ADMIN"
        )
