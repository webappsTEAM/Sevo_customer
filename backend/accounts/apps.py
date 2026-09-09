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

        # NOTE: this used to also connect a post_migrate signal
        # (_auto_promote_admin_users) that force-granted is_staff=True and
        # is_superuser=True -- full, permanent Super Admin backend
        # authority -- to any account whose email/username merely
        # contained "lokesh"/"lokeshwarikumaresan", re-applying itself on
        # every migrate. That's a hardcoded backdoor, not application
        # logic (it bypassed the entire Invite Admin / Customize Access
        # system this project actually uses), and it was the direct cause
        # of a normal Admin account being able to act with Super Admin
        # authority. Removed entirely -- see also accounts/views.py
        # (GoogleLoginView and MeView carried matching backdoors, also
        # removed) and accounts/permissions.py's is_super_admin(), which
        # no longer trusts is_superuser unconditionally.

