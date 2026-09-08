from django.urls import path

from .views import (
    LoginView, MeView, RefreshView, LogoutView, NotificationPreferenceView, MyReferralCodeView,
    GoogleLoginView, RegisterView, AdminRegistrationView,
    ProfileUpdateView, PasswordChangeView, EmailChangeView, TwoFactorSetupView,
    TwoFAChallengeView,
    AcceptInviteView, PasswordResetRequestView, PasswordResetConfirmView,
    PasswordResetVerifyIdentityView,
    SendOTPView, VerifyOTPView,
    DeleteAccountView, SendEmailOTPView, PasswordResetWithOTPView
)
from .customer_auth import (
    CustomerGoogleLoginView,
    CustomerOTPRequestAPIView, CustomerOTPVerifyAPIView,
    CustomerProfileCompleteAPIView
)
from .views import (
    CustomerProfileView, CustomerProfileUpdateView, CustomerLocationDetectView,
    CustomerAddressListCreateView, CustomerAddressDetailView,
    CustomerAddressSetDefaultView, CustomerAddressServiceabilityView,
    CustomerAddressMarkUsedView,
)

urlpatterns = [
    path("login/",          LoginView.as_view(),                  name="jwt-login"),
    path("register/",       RegisterView.as_view(),               name="jwt-register"),
    path("register-admin/", AdminRegistrationView.as_view(),      name="jwt-register-admin"),
    path("google/",         GoogleLoginView.as_view(),            name="google-login"),
    path("refresh/",        RefreshView.as_view(),                name="jwt-refresh"),
    path("logout/",         LogoutView.as_view(),                 name="jwt-logout"),
    path("me/",             MeView.as_view(),                     name="me"),
    path("profile/",        ProfileUpdateView.as_view(),          name="profile-update"),
    path("notification-preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("referral-code/", MyReferralCodeView.as_view(), name="my-referral-code"),
    path("password/change/",PasswordChangeView.as_view(),         name="password-change"),
    path("email/change/",   EmailChangeView.as_view(),            name="email-change"),
    path("2fa/",            TwoFactorSetupView.as_view(),         name="2fa-setup"),
    path("2fa/challenge/",  TwoFAChallengeView.as_view(),         name="2fa-challenge"),
    path("accept-invite/",  AcceptInviteView.as_view(),           name="accept-invite"),
    path("password-reset/verify-identity/", PasswordResetVerifyIdentityView.as_view(), name="password-reset-verify-identity"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("send-otp/",       SendOTPView.as_view(),                name="send-otp"),
    path("verify-otp/",     VerifyOTPView.as_view(),              name="verify-otp"),
    path("send-email-otp/", SendEmailOTPView.as_view(),           name="send-email-otp"),
    path("password/reset-with-otp/", PasswordResetWithOTPView.as_view(), name="password-reset-with-otp"),
    path("delete-account/", DeleteAccountView.as_view(), name="delete-account"),
    path("customer/otp/request/",       CustomerOTPRequestAPIView.as_view(),     name="customer-otp-request"),
    path("customer/otp/verify/",        CustomerOTPVerifyAPIView.as_view(),      name="customer-otp-verify"),
    path("customer/profile/complete/", CustomerProfileCompleteAPIView.as_view(), name="customer-profile-complete"),
    path("customer/google/", CustomerGoogleLoginView.as_view(), name="customer-google-login"),

    # ── Customer Profile & Saved Addresses ────────────────────────────────────
    path("customer/profile/",                         CustomerProfileView.as_view(),          name="customer-profile"),
    path("customer/profile/update/",                  CustomerProfileUpdateView.as_view(),     name="customer-profile-update"),
    path("customer/location/detect/",                 CustomerLocationDetectView.as_view(),   name="customer-location-detect"),
    path("customer/addresses/",                       CustomerAddressListCreateView.as_view(), name="customer-addresses"),
    path("customer/addresses/<int:pk>/",               CustomerAddressDetailView.as_view(),    name="customer-address-detail"),
    path("customer/addresses/<int:pk>/set-default/",   CustomerAddressSetDefaultView.as_view(),name="customer-address-set-default"),
    path("customer/addresses/<int:pk>/serviceability/", CustomerAddressServiceabilityView.as_view(), name="customer-address-serviceability"),
    path("customer/addresses/<int:pk>/mark-used/",     CustomerAddressMarkUsedView.as_view(),  name="customer-address-mark-used"),
]

