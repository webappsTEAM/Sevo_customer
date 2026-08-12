from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class CompanyMiddleware(MiddlewareMixin):
    """
    Resolves ``request.company`` for the currently authenticated user.

    This platform is single-schema — there is no per-tenant Postgres schema
    to switch anymore. Every model that needs to be scoped to a vendor
    carries an explicit ``company`` FK, and callers are responsible for
    filtering by it (see accounts.permissions.RequireModuleAccess and
    core.mixins.CompanyScopedQuerysetMixin). This middleware only figures
    out *which* company (if any) the request belongs to for staff/employee
    users — it does not gate access, and it deliberately leaves
    ``request.company`` as None for customer/marketplace requests, which
    are expected to span multiple vendors rather than belong to one.

    DRF JWT authentication runs INSIDE the view — AFTER all Django
    middleware — so request.user is still AnonymousUser at middleware time
    for JWT API calls. We read company_id directly from the JWT Bearer
    token/cookie instead of waiting for request.user.
    """

    def process_request(self, request):
        request.company = None

        path = request.path
        prefix = getattr(settings, "FORCE_SCRIPT_NAME", "") or ""
        if prefix and path.startswith(prefix):
            path = path[len(prefix):]

        if path.startswith('/api/auth/') or path.startswith('/api/company/create'):
            return None

        company = None

        # ── Read company_id from JWT Bearer token or cookie ─────────────────
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        token_str = None
        if auth_header.startswith('Bearer '):
            token_str = auth_header.split(' ')[1]
        else:
            cookie_name = getattr(settings, "AUTH_COOKIE", "qt_access")
            token_str = request.COOKIES.get(cookie_name)

        if token_str:
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = AccessToken(token_str)
                company_id = token.get('company_id')
                user_id = token.get('user_id')
                if user_id:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    u = User.objects.select_related('company').filter(id=user_id).first()
                    if u and u.company_id:
                        company = u.company
                if not company and company_id:
                    from companies.models import Company
                    company = Company.objects.filter(id=company_id).first()
            except Exception:
                pass

        # ── Fallback for session-based auth (Django admin, etc.) ────────────
        if not company:
            user = getattr(request, 'user', None)
            if user and user.is_authenticated:
                company = getattr(user, 'company', None)

        request.company = company
        return None
