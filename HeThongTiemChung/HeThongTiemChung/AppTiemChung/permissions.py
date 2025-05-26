from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Chỉ cho phép người dùng là admin (superuser hoặc staff) truy cập.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class IsStaffUser(permissions.BasePermission):
    """
    Chỉ cho phép người dùng là nhân viên, nhưng không phải superuser.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_staff and not request.user.is_superuser
