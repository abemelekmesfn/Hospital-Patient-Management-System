from rest_framework.permissions import BasePermission


class IsAuthenticatedAdmin(BasePermission):
    """Only active users with the ADMIN role may access admin APIs."""

    message = "Admin authentication required."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        return (request.user.role or "").upper() == "ADMIN"


class IsAdminOrReadOnly(BasePermission):
    """Allow read access to any authenticated user, write access to ADMIN."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
            
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True
            
        return getattr(user, "role", None) == "ADMIN"
