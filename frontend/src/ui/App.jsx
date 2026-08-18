import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useAuth } from "../state/auth/useAuth.js"
import { useRole } from "../state/auth/useRole.js"
import { routes } from "./routes.js"
import { AppShell } from "./shell/AppShell.jsx"
import { SessionToast } from "./components/SessionToast.jsx"
import { LoginPage } from "./pages/LoginPage.jsx"

// Lazy-loaded Pages
const OrganizationSignupPage = lazy(() =>
  import("./pages/OrganizationSignupPage.jsx").then(m => ({ default: m.OrganizationSignupPage }))
)

const AcceptInvitePage = lazy(() =>
  import("./pages/AcceptInvitePage.jsx").then(m => ({ default: m.AcceptInvitePage }))
)

const LandingPage = lazy(() =>
  import("./pages/LandingPage.jsx").then(m => ({ default: m.LandingPage }))
)

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage.jsx").then(m => ({ default: m.DashboardPage }))
)

const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage.jsx").then(m => ({ default: m.ResetPasswordPage }))
)

const ReportsPage = lazy(() =>
  import("./pages/ReportsPage.jsx").then(m => ({ default: m.ReportsPage }))
)

const SettingsPage = lazy(() =>
  import("./pages/SettingsPage.jsx").then(m => ({ default: m.SettingsPage }))
)

const AdminComplaintsPage = lazy(() =>
  import("./pages/AdminComplaintsPage.jsx").then(m => ({ default: m.AdminComplaintsPage }))
)

const CustomerCarePage = lazy(() =>
  import("./pages/CustomerCarePage.jsx").then(m => ({ default: m.CustomerCarePage || m.default }))
)

const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage.jsx").then(m => ({ default: m.OnboardingPage || m.default }))
)

const GetStartedPage = lazy(() =>
  import("./pages/GetStartedPage.jsx").then(m => ({ default: m.GetStartedPage || m.default }))
)

const HomePageCustomizerPage = lazy(() =>
  import("./pages/HomePageCustomizerPage.jsx").then(m => ({ default: m.HomePageCustomizerPage || m.default }))
)

const InventoryPage = lazy(() =>
  import("./pages/InventoryPage.jsx").then(m => ({ default: m.InventoryPage || m.default }))
)

const CatalogDashboardPage = lazy(() =>
  import("./pages/catalog/CatalogDashboardPage.jsx").then(m => ({ default: m.CatalogDashboardPage || m.default }))
)
const CatalogCategoriesPage = lazy(() =>
  import("./pages/catalog/CatalogCategoriesPage.jsx").then(m => ({ default: m.CatalogCategoriesPage || m.default }))
)
const CatalogServicesPage = lazy(() =>
  import("./pages/catalog/CatalogServicesPage.jsx").then(m => ({ default: m.CatalogServicesPage || m.default }))
)
const CatalogPackagesPage = lazy(() =>
  import("./pages/catalog/CatalogPackagesPage.jsx").then(m => ({ default: m.CatalogPackagesPage || m.default }))
)
const CatalogAddOnsPage = lazy(() =>
  import("./pages/catalog/CatalogAddOnsPage.jsx").then(m => ({ default: m.CatalogAddOnsPage || m.default }))
)
const CatalogChangeLogPage = lazy(() =>
  import("./pages/catalog/CatalogChangeLogPage.jsx").then(m => ({ default: m.CatalogChangeLogPage || m.default }))
)

const CouponsPage = lazy(() =>
  import("./pages/marketing/CouponsPage.jsx").then(m => ({ default: m.CouponsPage || m.default }))
)
const OffersPage = lazy(() =>
  import("./pages/marketing/OffersPage.jsx").then(m => ({ default: m.OffersPage || m.default }))
)
const ReferralsPage = lazy(() =>
  import("./pages/marketing/ReferralsPage.jsx").then(m => ({ default: m.ReferralsPage || m.default }))
)

const ServiceRequestsPage = lazy(() =>
  import("./pages/ServiceRequestsPage.jsx").then(m => ({ default: m.ServiceRequestsPage }))
)

const FeedbackManagementPage = lazy(() =>
  import("./pages/FeedbackManagementPage.jsx").then(m => ({ default: m.FeedbackManagementPage }))
)

const BookingPage = lazy(() =>
  import("./pages/BookingPage.jsx").then(m => ({ default: m.BookingPage }))
)
const MiniTruckBookingHosurPage = lazy(() =>
  import("./pages/MiniTruckBookingHosurPage.jsx").then(m => ({ default: m.MiniTruckBookingHosurPage }))
)
const TwoWheelerBookingHosurPage = lazy(() =>
  import("./pages/TwoWheelerBookingHosurPage.jsx").then(m => ({ default: m.TwoWheelerBookingHosurPage }))
)
const PackersMoversBookingHosurPage = lazy(() =>
  import("./pages/PackersMoversBookingHosurPage.jsx").then(m => ({ default: m.PackersMoversBookingHosurPage }))
)
const FeedbackPage = lazy(() =>
  import("./pages/FeedbackPage.jsx").then(m => ({ default: m.FeedbackPage }))
)
const CustomerDecisionPage = lazy(() =>
  import("./pages/CustomerDecisionPage.jsx").then(m => ({ default: m.CustomerDecisionPage }))
)

const LiveTrackingPage = lazy(() =>
  import("./pages/LiveTrackingPage.jsx").then(m => ({ default: m.LiveTrackingPage }))
)

function RequireAdmin() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin) return <Navigate to={routes.dashboard} replace />
  return <Outlet />
}

function RequireAdminSettings() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin) return <Navigate to={routes.settings_profile} replace />
  return <Outlet />
}

function RequireCareAgentOrAdmin() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin && !user.isCareAgent) {
    return <Navigate to={routes.dashboard} replace />
  }
  return <Outlet />
}

const ONBOARDING_DISMISSED_KEY = "caltrack.onboarding.dismissed"

export function App() {
  const { isReady, user } = useAuth()
  const { isAdmin, isSupport, isCustomer } = useRole()

  const adminDefaultRoute = () => {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
    return dismissed ? routes.dashboard : routes.get_started
  }

  const getAuthenticatedDefaultRoute = (u) => {
    if (!u) return routes.login
    if (u.role === "customer") return routes.landing
    if (u.role === "support" || u.isCareAgent) return "/support/tickets"
    if (u.role === "admin" || u.role === "manager") {
      return u.companyId ? adminDefaultRoute() : routes.onboarding
    }
    return u.companyId ? routes.dashboard : routes.onboarding
  }

  const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  if (!isReady)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #f8fafc)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid var(--stroke, #e2e8f0)",
            borderTopColor: "#4F46E5",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path={routes.login}
            element={<LoginPage />}
          />

          <Route
            path={routes.organization_signup}
            element={
              user ? (
                <Navigate to={getAuthenticatedDefaultRoute(user)} replace />
              ) : (
                <OrganizationSignupPage />
              )
            }
          />

          <Route
            path={routes.onboarding}
            element={
              !user ? (
                <Navigate to={routes.login} replace />
              ) : user.role === "customer" ? (
                <Navigate to={routes.landing} replace />
              ) : user.companyId ? (
                <Navigate to={getAuthenticatedDefaultRoute(user)} replace />
              ) : (
                <OnboardingPage />
              )
            }
          />

          <Route
            path={routes.reset_password}
            element={
              user ? <Navigate to={getAuthenticatedDefaultRoute(user)} replace /> : <ResetPasswordPage />
            }
          />

          <Route
            path={routes.accept_invite}
            element={
              user ? (
                <Navigate to={getAuthenticatedDefaultRoute(user)} replace />
              ) : (
                <AcceptInvitePage />
              )
            }
          />

          {/* ── Public / Customer Routes ── */}
          <Route
            path="/"
            element={
              user && user.role !== "customer" && user.companyId ? (
                <Navigate to={getAuthenticatedDefaultRoute(user)} replace />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route path={routes.landing} element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path={routes.booking} element={<LandingPage />} />
          <Route path={routes.booking_services} element={<LandingPage />} />
          <Route path={routes.booking_checkout} element={<BookingPage />} />
          <Route path={routes.truck_booking_hosur} element={<MiniTruckBookingHosurPage />} />
          <Route path="/trucks/hosur" element={<MiniTruckBookingHosurPage />} />
          <Route path="/trucks" element={<MiniTruckBookingHosurPage />} />
          <Route path="/booking/trucks" element={<MiniTruckBookingHosurPage />} />
          <Route path={routes.two_wheeler_booking_hosur} element={<TwoWheelerBookingHosurPage />} />
          <Route path="/two-wheelers/hosur" element={<TwoWheelerBookingHosurPage />} />
          <Route path="/two-wheelers" element={<TwoWheelerBookingHosurPage />} />
          <Route path="/booking/two-wheelers" element={<TwoWheelerBookingHosurPage />} />
          <Route path={routes.packers_movers_booking_hosur} element={<PackersMoversBookingHosurPage />} />
          <Route path="/packers-and-movers/hosur" element={<PackersMoversBookingHosurPage />} />
          <Route path="/packers-and-movers" element={<PackersMoversBookingHosurPage />} />
          <Route path="/booking/packers-and-movers" element={<PackersMoversBookingHosurPage />} />
          <Route path={routes.feedback} element={<FeedbackPage />} />
          <Route path={routes.customer_work_extension} element={<CustomerDecisionPage />} />
          <Route path="/customer/decision/:token" element={<CustomerDecisionPage />} />

          {/* ── Public Customer Live Tracking — no auth, secured by tracking_token query param ── */}
          <Route path={routes.live_tracking} element={<LiveTrackingPage />} />
          {/* Alias: /track/<bookingId> without :bookingId pattern for deep linking */}

          {/* ── Authenticated Shell ── */}
          <Route
            element={
              !user ? (
                <Navigate to={routes.login} replace />
              ) : user.role === "customer" ? (
                <Navigate to={routes.landing} replace />
              ) : !user.companyId ? (
                <Navigate to={routes.onboarding} replace />
              ) : (
                <AppShell />
              )
            }
          >
            <Route
              path={routes.dashboard}
              element={
                user?.role === "customer" ? (
                  <Navigate to={routes.landing} replace />
                ) : user?.role === "support" || (user?.isCareAgent && user?.role !== "admin" && user?.role !== "manager") ? (
                  <Navigate to="/support/tickets" replace />
                ) : (
                  <DashboardPage />
                )
              }
            />
            <Route element={<RequireCareAgentOrAdmin />}>
              <Route path="/support/tickets" element={<CustomerCarePage />} />
            </Route>
            <Route path={routes.inventory} element={<InventoryPage />} />
            <Route path={routes.reports} element={<ReportsPage />} />

            {/* Profile settings */}
            <Route path={routes.settings} element={<SettingsPage />} />
            <Route path={routes.settings_profile} element={<SettingsPage section="profile" />} />
            <Route path={routes.settings_notifications} element={<SettingsPage section="notifications" />} />
            <Route path={routes.settings_preferences} element={<SettingsPage section="preferences" />} />
            <Route path={routes.settings_security} element={<SettingsPage section="security" />} />
            <Route path={routes.settings_data} element={<SettingsPage section="data" />} />

            {/* ── Admin-only routes ── */}
            <Route element={<RequireAdmin />}>
              <Route path={routes.get_started} element={<GetStartedPage />} />
              <Route path={routes.catalog_dashboard} element={<CatalogDashboardPage />} />
              <Route path={routes.catalog_categories} element={<CatalogCategoriesPage />} />
              <Route path={routes.catalog_services} element={<CatalogServicesPage />} />
              <Route path={routes.catalog_packages} element={<CatalogPackagesPage />} />
              <Route path={routes.catalog_addons} element={<CatalogAddOnsPage />} />
              <Route path={routes.catalog_change_log} element={<CatalogChangeLogPage />} />
              <Route path={routes.marketing_coupons} element={<CouponsPage />} />
              <Route path={routes.marketing_offers} element={<OffersPage />} />
              <Route path={routes.marketing_referrals} element={<ReferralsPage />} />
              <Route path={routes.homepage_customizer} element={<HomePageCustomizerPage />} />
              <Route path={routes.admin_service_requests} element={<ServiceRequestsPage />} />
              <Route path={routes.admin_feedback} element={<FeedbackManagementPage />} />
              <Route path="/customers/list" element={<ServiceRequestsPage />} />
              <Route path="/customers/bookings" element={<ServiceRequestsPage />} />
              <Route path="/customers/reschedules" element={<ServiceRequestsPage />} />
              <Route path="/customers/refunds" element={<ServiceRequestsPage />} />
              <Route path="/customers/payments" element={<ServiceRequestsPage />} />
              <Route path="/customers/documents" element={<ServiceRequestsPage />} />
              <Route path="/customers/complaints" element={<AdminComplaintsPage />} />
              <Route path="/customers/reviews" element={<FeedbackManagementPage />} />
            </Route>

            {/* ── Admin-only settings ── */}
            <Route element={<RequireAdminSettings />}>
              <Route path={routes.settings_team} element={<SettingsPage section="team" />} />
              <Route path={routes.settings_reports} element={<SettingsPage section="reports" />} />
              <Route path={routes.settings_rbac} element={<SettingsPage section="rbac" />} />
              <Route path={routes.settings_audit} element={<SettingsPage section="audit" />} />
              <Route path={routes.settings_devices} element={<SettingsPage section="devices" />} />
              <Route path={routes.settings_branding} element={<SettingsPage section="branding" />} />
              <Route path={routes.settings_organization} element={<SettingsPage section="organization" />} />
              <Route path={routes.settings_integrations} element={<SettingsPage section="integrations" />} />
              <Route path={routes.settings_developer} element={<SettingsPage section="developer" />} />
              <Route path={routes.settings_billing} element={<SettingsPage section="billing" />} />
              <Route path={routes.settings_invoices} element={<SettingsPage section="invoices" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={getAuthenticatedDefaultRoute(user)} replace />} />
        </Routes>
      </Suspense>
      <SessionToast />
    </>
  )
}
