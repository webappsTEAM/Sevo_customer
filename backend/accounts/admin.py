from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role", "company")}),)
    list_display = ("username", "email", "first_name", "last_name", "role", "company", "is_staff", "is_active")
    list_filter = ("role", "company", "is_staff", "is_active")
    