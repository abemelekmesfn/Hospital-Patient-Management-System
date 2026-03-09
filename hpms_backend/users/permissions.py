from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'ADMIN'


class IsTriage(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'TRIAGE'


class IsReception(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'RECEPTION'


class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'DOCTOR'


class IsNurse(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'NURSE'


class IsLaboratory(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'LABORATORY'


class IsPharmacist(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'PHARMACIST'


class IsCashier(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'CASHIER'