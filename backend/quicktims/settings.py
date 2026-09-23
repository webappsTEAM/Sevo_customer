from datetime import timedelta
from pathlib import Path
import os
import sys
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment settings from .env (reloaded with correct DB password)
_dotenv_override = os.getenv("SEVO_DOTENV_OVERRIDE", "1").strip() != "0"
load_dotenv(BASE_DIR / ".env", override=_dotenv_override)

_SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not _SECRET_KEY:
    import sys
    sys.exit(
        "FATAL: DJANGO_SECRET_KEY environment variable is not set. "
        "Set it in your .env file (for local dev) or as a system environment variable (for production). "
        "Do NOT hard-code a secret key in settings."
    )
SECRET_KEY = _SECRET_KEY

# DEBUG is OFF by default. Must be explicitly set to "1" or "True" in the environment.
DEBUG = os.getenv("DJANGO_DEBUG", "0").strip().lower() in ("1", "true", "yes")

# Fixed: this used to hardcode ALLOWED_HOSTS = ["*"] unconditionally,
# ignoring the DJANGO_ALLOWED_HOSTS env var that's already set correctly in
# every .env file this app ships with -- host-header validation was fully
# disabled in the app actually running. Mirrors the pattern already used
# correctly on the Vendor app's settings.py.
_allowed_hosts_env = os.getenv("DJANGO_ALLOWED_HOSTS")
if _allowed_hosts_env:
    ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()]
else:
    ALLOWED_HOSTS = ["*"] if DEBUG else ["localhost", "127.0.0.1"]

# ── Subpath / Reverse-proxy settings ─────────────────────────────────────────
# Required when Django is served under a subpath (e.g. /Caltrack/) behind Nginx.
# Set FORCE_SCRIPT_NAME=/Caltrack in production .env
FORCE_SCRIPT_NAME = os.getenv("FORCE_SCRIPT_NAME", "")
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "daphne",
    "common",
    "companies",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "accounts",
    "corsheaders",
    "rest_framework",
    "channels",
    "django_celery_beat",
    "trial_management",
    "settings_hub",
    "inventory",
    "service_requests",
    "logistics",
    "orders",
    "carts",
    "customer_care",
    "reports",
    "workforce_integration",
    "customer_analytics",
    "platform_control",
]

ASGI_APPLICATION = "quicktims.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "common.middleware.RequestLatencyLoggingMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Allow Google Sign-In popup to return tokens properly
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

# ---------------------------------------------------------------------------
# Database Configuration - PostgreSQL (Production) or SQLite (Local Dev)
# ---------------------------------------------------------------------------

USE_POSTGRES = os.getenv("DB_NAME") or os.getenv("DB_HOST")
_argv_str = " ".join(sys.argv).lower()
IS_TESTING = (
    "test" in sys.argv
    or "pytest" in sys.modules
    or "pytest" in _argv_str
    or "unittest" in _argv_str
    or os.getenv("DJANGO_TEST_SQLITE") == "1"
    or os.getenv("SEVO_TESTING") == "1"
)

if IS_TESTING:
    TESTING = True
    PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
elif USE_POSTGRES:
    _db_options = {}
    _sslmode = os.getenv("DB_SSLMODE", "")
    if _sslmode:
        _db_options["sslmode"] = _sslmode

    # Pin the schema explicitly — the platform is single-schema (public) now
    # that django-tenants is gone, and nothing else sets the active schema
    # per-request anymore. Without this, connections fall back to whatever
    # search_path the DB role defaults to, which may not be "public".
    _connection_opts = [f'-c search_path={os.getenv("DB_SCHEMA", "public")}']
    _stmt_timeout = os.getenv("DB_STATEMENT_TIMEOUT", "")
    if _stmt_timeout:
        _connection_opts.append(f"-c statement_timeout={_stmt_timeout}")
    _db_options["options"] = " ".join(_connection_opts)

    _db_host = os.getenv("DB_HOST", "localhost")
    if _db_host == "aws-0-ap-south-1.pooler.supabase.com":
        try:
            import socket
            socket.gethostbyname(_db_host)
        except Exception:
            _db_host = "3.111.105.85"

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "postgres"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": _db_host,
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": _db_options,
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "0")),
            "CONN_HEALTH_CHECKS": True,
        }
    }
else:
    # Local Development Fallback to SQLite
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

_e2e_sqlite_path = os.getenv("SEVO_E2E_SQLITE_PATH")
if _e2e_sqlite_path:
    if DEBUG or IS_TESTING:
        DATABASES["default"] = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": Path(_e2e_sqlite_path),
        }
    else:
        import logging
        logging.getLogger(__name__).warning(
            "SEVO_E2E_SQLITE_PATH is ignored because DEBUG is False and IS_TESTING is False."
        )



ROOT_URLCONF = "quicktims.urls"
APPEND_SLASH = False  # Prevents RuntimeError on POST to non-slash URLs

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
            ],
        },
    }
]

WSGI_APPLICATION = "quicktims.wsgi.application"
ASGI_APPLICATION = "quicktims.asgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Kolkata")
USE_I18N = True
USE_TZ = True

# ── Booking window ──────────────────────────────────────────────────────────
# Same-day bookings close at this local hour; afterwards customers are offered
# the next day's slots. Enforced server-side in
# service_requests/booking_window.py, which the booking serializer calls -- the
# frontend filter is a convenience, not the control. Tunable per environment.
BOOKING_SAME_DAY_CUTOFF_HOUR = int(os.getenv("BOOKING_SAME_DAY_CUTOFF_HOUR", "18"))
BOOKING_MIN_LEAD_MINUTES = int(os.getenv("BOOKING_MIN_LEAD_MINUTES", "60"))

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# Email Configuration
EMAIL_HOST = os.getenv("EMAIL_HOST")
if EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    DEFAULT_FROM_EMAIL = "noreply@caltrack.com"

AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailOrUsernameModelBackend",
    "django.contrib.auth.backends.ModelBackend",
]


# ── Caching ───────────────────────────────────────────────────────────────────
# Production: swap the backend for Redis using the CACHE_URL env var.
# Dev / default: in-process local-memory cache (zero config).
_cache_url = os.getenv("CACHE_URL")
if _cache_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _cache_url,
            "TIMEOUT": 300,  # 5 min default TTL
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "quicktims-default",
            "TIMEOUT": 300,
        }
    }

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # Cookie-first auth — also accepts Bearer header for API clients / mobile.
        # SessionAuthentication is intentionally excluded: it triggers CSRF enforcement
        # on every POST, which breaks /auth/login/ and /auth/refresh/ since the SPA
        # never sends a CSRF token. All auth is handled via httpOnly JWT cookies.
        "accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    # Throttle anonymous and authenticated endpoints to protect DB
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "60/minute"),
        "user": os.getenv("THROTTLE_USER", "300/minute"),
        # Fixes EC-06: the blanket anon/user rates above are the only
        # protection every endpoint had, including ones a blunt 60/min
        # limit does not fit (booking creation, payment, invoice/PII
        # lookups). These scopes are opt-in per view via
        # ScopedRateThrottle + throttle_scope, tighter than the default.
        "booking_create": os.getenv("THROTTLE_BOOKING_CREATE", "20/hour"),
        "payment": os.getenv("THROTTLE_PAYMENT", "15/minute"),
        "tracking_lookup": os.getenv("THROTTLE_TRACKING", "60/minute"),
        "feedback": os.getenv("THROTTLE_FEEDBACK", "10/hour"),
        "coupon_validate": os.getenv("THROTTLE_COUPON", "20/minute"),
        "invoice_download": os.getenv("THROTTLE_INVOICE", "20/hour"),
        # GT-B-01: the logistics quote endpoint is public (the booking
        # pages are pre-login) and every cache miss costs a real, billed
        # Google Distance Matrix call, so it needs a tighter limit than
        # the blanket anon rate. Generous enough for a customer adjusting
        # pickup/drop a few times, tight enough that it is not a free
        # metered-API proxy.
        "logistics_quote": os.getenv("THROTTLE_LOGISTICS_QUOTE", "30/minute"),
        # The vendor app's webhook receiver. It was previously covered only
        # by the blanket anon rate above (60/minute), which is the wrong
        # control for authenticated machine-to-machine traffic and far too
        # low for it: the vendor POSTs one request per event, and GPS alone
        # is roughly six per minute PER ACTIVE DRIVER. Ten drivers on the
        # road saturate 60/minute; twenty lose half their events. Delivery
        # is fire-and-forget with no retry, so a throttled event is lost
        # permanently -- the customer's map freezes, proof never arrives,
        # the fare is never reconciled, and nothing errors anywhere.
        #
        # The real authentication for this endpoint is the HMAC/shared
        # secret it verifies, not a rate limit; this scope exists only as
        # DoS headroom. Sized for ~200 concurrent trips and configurable.
        "workforce_webhook": os.getenv("THROTTLE_WORKFORCE_WEBHOOK", "1200/minute"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "480"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── httpOnly JWT Cookie settings ─────────────────────────────────────────────
AUTH_COOKIE          = "qt_access"         # access token cookie name
AUTH_COOKIE_REFRESH  = "qt_refresh"        # refresh token cookie name
AUTH_COOKIE_SECURE   = not DEBUG           # HTTPS-only in production; False in dev
# "Lax" is required for cross-origin dev (frontend:5173 → backend:8000).
# In production with same domain, change back to "Strict" via env var.
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "Lax" if DEBUG else "Strict")
AUTH_COOKIE_DOMAIN = os.getenv("AUTH_COOKIE_DOMAIN", None)

# ── CORS — must name origins explicitly when credentials=True ────────────────
# CORS_ALLOW_ALL_ORIGINS + CORS_ALLOW_CREDENTIALS together are rejected by browsers.
CORS_ALLOW_ALL_ORIGINS = False

_default_cors_origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production VPS
    "https://caldimproducts.com",
    "https://www.caldimproducts.com",
]

_env_cors = os.getenv("CORS_ALLOWED_ORIGINS")
if _env_cors:
    _parsed_cors = [o.strip() for o in _env_cors.split(",") if o.strip()]
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_parsed_cors + _default_cors_origins))
else:
    CORS_ALLOWED_ORIGINS = _default_cors_origins

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://.*\.localhost:517[0-9]$",
    r"^http://.*\.127\.0\.0\.1:517[0-9]$",
    r"^http://localhost:517[0-9]$",
    r"^http://127\.0\.0\.1:517[0-9]$",
]
CORS_ALLOW_CREDENTIALS = True

_default_csrf_origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://*.localhost:5173",
    "http://*.localhost:5174",
    "http://*.localhost:5175",
    "http://*.localhost:5176",
    "http://*.127.0.0.1:5173",
    "http://*.127.0.0.1:5174",
    "http://*.127.0.0.1:5175",
    "http://*.127.0.0.1:5176",
    # Production VPS
    "https://caldimproducts.com",
    "https://www.caldimproducts.com",
]

_env_csrf = os.getenv("CSRF_TRUSTED_ORIGINS")
if _env_csrf:
    _parsed_csrf = [o.strip() for o in _env_csrf.split(",") if o.strip()]
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_parsed_csrf + CORS_ALLOWED_ORIGINS + _default_csrf_origins))
else:
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS + _default_csrf_origins))


MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = BASE_DIR / "media"
ASSET_IMAGES_DIR = BASE_DIR / "ASSET IMAGES"

STATIC_ROOT = BASE_DIR / "staticfiles"

# ── Django Channels ──────────────────────────────────────────────────────────
if DEBUG:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [(os.getenv("REDIS_HOST", "127.0.0.1"), int(os.getenv("REDIS_PORT", "6379")))],
                "capacity": 1500,
                "expiry": 10,
            },
        },
    }

# ── Email Settings for Auth & OTP ─────────────────────────────────────────────
_email_user = (os.getenv("EMAIL_HOST_USER") or "").strip()
_email_pass = (os.getenv("EMAIL_HOST_PASSWORD") or "").replace(" ", "").strip()

if _email_user and _email_pass:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = _email_user
    EMAIL_HOST_PASSWORD = _email_pass
    DEFAULT_FROM_EMAIL = _email_user
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend" # Prints to console for dev
    DEFAULT_FROM_EMAIL = "noreply@caltrack.com"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
AUTO_GENERATE_OTP = os.getenv("AUTO_GENERATE_OTP", "False").strip().lower() in ("1", "true", "yes")

# ── Payment Gateway (Razorpay) ────────────────────────────
# Fixes HS-C-01: real order creation and signature verification only run
# when live gateway keys are configured. When they are not, PaymentVerifyView
# refuses to mark bookings paid instead of trusting an unauthenticated,
# client-supplied "mock_success" flag (the previous behaviour).
RAZORPAY_KEY_ID = (os.getenv("RAZORPAY_KEY_ID") or os.getenv("RAZORPAYX_KEY_ID") or "").strip()
RAZORPAY_KEY_SECRET = (os.getenv("RAZORPAY_KEY_SECRET") or os.getenv("RAZORPAYX_KEY_SECRET") or "").strip()
RAZORPAYX_KEY_ID = (os.getenv("RAZORPAYX_KEY_ID") or os.getenv("RAZORPAY_KEY_ID") or "").strip()
RAZORPAYX_KEY_SECRET = (os.getenv("RAZORPAYX_KEY_SECRET") or os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
RAZORPAYX_ACCOUNT_NUMBER = os.getenv("RAZORPAYX_ACCOUNT_NUMBER", "").strip()
RAZORPAYX_WEBHOOK_SECRET = os.getenv("RAZORPAYX_WEBHOOK_SECRET", "").strip()
RAZORPAYX_MOCK_MODE = os.getenv("RAZORPAYX_MOCK_MODE", "0").strip().lower() in ("1", "true", "yes")

# Explicit opt-in only: lets a developer exercise the payment flow end-to-end
# on a machine with no gateway credentials. Must never be enabled outside
# local development.
PAYMENT_SANDBOX_MODE = os.getenv("PAYMENT_SANDBOX_MODE", "0").strip().lower() in ("1", "true", "yes")

# ── Workforce Integration ────────────────────────────────────────────────────
WORKFORCE_API_BASE_URL = os.getenv("WORKFORCE_API_BASE_URL", "http://localhost:8001/api/workforce").rstrip("/")
WORKFORCE_API_KEY = os.getenv("WORKFORCE_API_KEY", "").strip()
WORKFORCE_WEBHOOK_SECRET = os.getenv(
    "WORKFORCE_WEBHOOK_SECRET",
    "dev-insecure-workforce-webhook-secret-local-testing-only" if DEBUG else ""
).strip()

# ── Supabase Storage ─────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "admin-media").strip()
ENABLE_LOCAL_STORAGE_FALLBACK = os.getenv(
    "ENABLE_LOCAL_STORAGE_FALLBACK",
    "1" if DEBUG else "0"
).strip().lower() in ("1", "true", "yes")

# ── Google Services & OAuth ──────────────────────────────────────────────────
GOOGLE_CLIENT_ID = (os.getenv("GOOGLE_CLIENT_ID") or os.getenv("Client_ID") or "").strip()
GOOGLE_CLIENT_SECRET = (os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("Client_secret") or "").strip()

# — Google Maps (X-10: server-side routing/ETA & geocoding) ────────────────────
# Backend-only key -- never send this to the frontend. The Vite
# VITE_GOOGLE_MAPS_KEY/VITE_GOOGLE_MAPS_API_KEY vars are a separate,
# browser-restricted key for the Maps JS SDK; this one is used server-side
# by service_requests/services/routing.py for the Distance Matrix API, so
# distance/ETA are computed server-side rather than trusting the client.
GOOGLE_MAPS_API_KEY = (
    os.getenv("GOOGLE_MAPS_API_KEY")
    or os.getenv("VITE_GOOGLE_MAPS_KEY")
    or os.getenv("VITE_GOOGLE_MAPS_API_KEY")
    or ""
).strip()


# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "True") == "True"

# ── Performance & Application Logging Configuration ──────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "%(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "performance": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

if "test" in sys.argv or IS_TESTING:
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
        k: "10000/minute" for k in REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
    }


# ── Test Database Safety Guard ───────────────────────────────────────────────
# Aborts execution if testing mode is active but the final resolved database
# engine is anything other than SQLite.
if IS_TESTING:
    _final_engine = DATABASES.get("default", {}).get("ENGINE", "")
    if "sqlite3" not in _final_engine:
        raise RuntimeError(
            f"TEST DATABASE SAFETY GUARD FATAL: Testing mode detected (IS_TESTING=True), "
            f"but final DATABASES['default']['ENGINE'] is '{_final_engine}'. "
            "Tests must run on SQLite only to protect shared/production databases."
        )

# ── Workforce & Marketplace Integration Settings ──────────────────────────────
WORKFORCE_API_BASE_URL = (os.getenv("WORKFORCE_API_BASE_URL") or "http://127.0.0.1:8001/api/workforce").replace("localhost", "127.0.0.1").rstrip("/")
SEVO_INTEGRATION_SECRET = (os.getenv("SEVO_INTEGRATION_SECRET") or "caldim_secure_webhook_token_2026").strip()
WORKFORCE_WEBHOOK_SECRET = (os.getenv("WORKFORCE_WEBHOOK_SECRET") or "caldim_secure_webhook_token_2026").strip()






