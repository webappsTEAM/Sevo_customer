import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useAuth } from "../state/auth/useAuth.js"
import { useRole } from "../state/auth/useRole.js"
import { isSuperAdmin, can as canAccess } from "../auth/authorization.js"
import { routes } from "./routes.js"
import { AppShell } from "./shell/AppShell.jsx"
import { SessionToast } from "./components/SessionToast.jsx"
import { GlobalEditModeToggle } from "./components/GlobalEditModeToggle.jsx"
import { MobileBottomNav } from "./components/common/MobileBottomNav.jsx"
import { AIChatWidget } from "./components/ai/AIChatWidget.jsx"
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

const VegetableStockAdminPage = lazy(() =>
  import("./pages/inventory/VegetableStockAdminPage.jsx").then(m => ({ default: m.VegetableStockAdminPage || m.default }))
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
const CatalogVendorApprovalsPage = lazy(() =>
  import("./pages/catalog/CatalogVendorApprovalsPage.jsx").then(m => ({ default: m.CatalogVendorApprovalsPage || m.default }))
)
const PaintingRateCardPage = lazy(() =>
  import("./pages/catalog/PaintingRateCardPage.jsx").then(m => ({ default: m.PaintingRateCardPage || m.default }))
)
const GTPricingPage = lazy(() =>
  import("./pages/catalog/GTPricingPage.jsx").then(m => ({ default: m.GTPricingPage || m.default }))
)
const AdminRecipesPage = lazy(() =>
  import("./pages/catalog/AdminRecipesPage.jsx").then(m => ({ default: m.AdminRecipesPage || m.default }))
)
const AdminRecommendationsPage = lazy(() =>
  import("./pages/catalog/AdminRecommendationsPage.jsx").then(m => ({ default: m.AdminRecommendationsPage || m.default }))
)

const CustomersDashboardPage = lazy(() => import("./pages/CustomersDashboardPage.jsx").then(m => ({ default: m.CustomersDashboardPage })))
const CustomersListPage = lazy(() => import("./pages/CustomersListPage.jsx").then(m => ({ default: m.CustomersListPage })))
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage.jsx").then(m => ({ default: m.CustomerDetailPage })))
const CustomersPaymentsPage = lazy(() => import("./pages/CustomersPaymentsPage.jsx").then(m => ({ default: m.CustomersPaymentsPage })))
const CustomerMergesPage = lazy(() => import("./pages/CustomerMergesPage.jsx").then(m => ({ default: m.CustomerMergesPage })))

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
  import("./pages/ServiceRequestsPage.jsx").then(m => ({ default: m.ServiceRequestsPage || m.default }))
)

const FeedbackManagementPage = lazy(() =>
  import("./pages/FeedbackManagementPage.jsx").then(m => ({ default: m.FeedbackManagementPage || m.default }))
)

const BookingPage = lazy(() =>
  import("./pages/BookingPage.jsx").then(m => ({ default: m.BookingPage || m.default }))
)
const ACInspectionBookingPage = lazy(() =>
  import("./pages/ACInspectionBookingPage.jsx").then(m => ({ default: m.ACInspectionBookingPage || m.default }))
)
const ACInspectionStatusPage = lazy(() =>
  import("./pages/ACInspectionStatusPage.jsx").then(m => ({ default: m.ACInspectionStatusPage || m.default }))
)
const VegetableFullScreenPage = lazy(() =>
  import("./pages/VegetableFullScreenPage.jsx").then(m => ({ default: m.VegetableFullScreenPage || m.default }))
)
const MiniTruckBookingHosurPage = lazy(() =>
  import("./pages/MiniTruckBookingHosurPage.jsx").then(m => ({ default: m.MiniTruckBookingHosurPage || m.default }))
)
const TwoWheelerBookingHosurPage = lazy(() =>
  import("./pages/TwoWheelerBookingHosurPage.jsx").then(m => ({ default: m.TwoWheelerBookingHosurPage || m.default }))
)
const PackersMoversBookingHosurPage = lazy(() =>
  import("./pages/PackersMoversBookingHosurPage.jsx").then(m => ({ default: m.PackersMoversBookingHosurPage || m.default }))
)
const LogisticsBookingPage = lazy(() =>
  import("./pages/LogisticsBookingPage.jsx").then(m => ({ default: m.LogisticsBookingPage || m.default }))
)
const FeedbackPage = lazy(() =>
  import("./pages/FeedbackPage.jsx").then(m => ({ default: m.FeedbackPage || m.default }))
)
const CustomerDecisionPage = lazy(() =>
  import("./pages/CustomerDecisionPage.jsx").then(m => ({ default: m.CustomerDecisionPage || m.default }))
)
const QuotationDecisionPage = lazy(() =>
  import("./pages/QuotationDecisionPage.jsx").then(m => ({ default: m.QuotationDecisionPage || m.default }))
)

const LiveTrackingPage = lazy(() =>
  import("./pages/LiveTrackingPage.jsx").then(m => ({ default: m.LiveTrackingPage || m.default }))
)

// Public Legal & Customer Policy Pages
const TermsPage = lazy(() =>
  import("./pages/legal/TermsPage.jsx").then(m => ({ default: m.TermsPage || m.default }))
)
const PrivacyPage = lazy(() =>
  import("./pages/legal/PrivacyPage.jsx").then(m => ({ default: m.PrivacyPage || m.default }))
)
const ServiceDeliveryPage = lazy(() =>
  import("./pages/legal/ServiceDeliveryPage.jsx").then(m => ({ default: m.ServiceDeliveryPage || m.default }))
)
const CancellationRefundPage = lazy(() =>
  import("./pages/legal/CancellationRefundPage.jsx").then(m => ({ default: m.CancellationRefundPage || m.default }))
)
const ContactUsPage = lazy(() =>
  import("./pages/legal/ContactUsPage.jsx").then(m => ({ default: m.ContactUsPage || m.default }))
)
const HelpSupportPage = lazy(() =>
  import("./pages/legal/HelpSupportPage.jsx").then(m => ({ default: m.HelpSupportPage || m.default }))
)

// Platform Super Admin Control Center Pages
const PlatformDashboardPage = lazy(() => import("./pages/platform/PlatformDashboardPage.jsx"))
const PlatformUsersPage = lazy(() => import("./pages/platform/PlatformUsersPage.jsx"))
const PlatformCustomersPage = lazy(() => import("./pages/platform/PlatformCustomersPage.jsx"))
const PlatformRBACPage = lazy(() => import("./pages/platform/PlatformRBACPage.jsx"))
const PlatformSecurityPage = lazy(() => import("./pages/platform/PlatformSecurityPage.jsx"))
const PlatformAuditPage = lazy(() => import("./pages/platform/PlatformAuditPage.jsx"))

function RequireSuperAdmin() {
  const { user } = useAuth()
  const isSuper = Boolean(user?.is_superuser || user?.is_super_admin || user?.role === "super_admin" || user?.role === "superadmin" || user?.isSuperAdmin)
  if (!user) return <Navigate to={routes.login} replace />
  if (!isSuper) return <Navigate to={routes.dashboard} replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const isSuper = Boolean(user?.is_superuser || user?.is_super_admin || user?.role === "super_admin" || user?.isSuperAdmin)
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin && !isSuper) return <Navigate to={routes.dashboard} replace />
  return <Outlet />
}

function RequireAdminSettings() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const isSuper = Boolean(user?.is_superuser || user?.is_super_admin || user?.role === "super_admin" || user?.isSuperAdmin)
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin && !isSuper) return <Navigate to={routes.settings_profile} replace />
  return <Outlet />
}

/**
 * Per-module frontend route gate. RequireAdmin only checks role (any
 * Admin/Super Admin gets past it) — it doesn't know which modules a given
 * Admin was actually granted via Super Admin > Admin Management >
 * Customize Access. This wraps a single route element and additionally
 * requires `can(user, module, action)` (same custom_permissions-aware
 * check the backend enforces via accounts.permissions.can — see
 * auth/authorization.js), so an Admin who wasn't granted a module can no
 * longer even navigate to its page, not just have its API calls rejected.
 * Super Admin always bypasses, same as everywhere else in the app.
 */
function RequireModule({ module, action = "view", children }) {
  const { user } = useAuth()
  const isSuper = isSuperAdmin(user)
  if (!user) return <Navigate to={routes.login} replace />
  if (!isSuper && !canAccess(user, module, action)) return <Navigate to={routes.dashboard} replace />
  return children
}

function RequireCareAgentOrAdmin() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const isSuper = Boolean(user?.is_superuser || user?.is_super_admin || user?.role === "super_admin" || user?.isSuperAdmin)
  if (!user) return <Navigate to={routes.login} replace />
  if (!isAdmin && !user.isCareAgent && !isSuper) {
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
    if (u.isSuperAdmin || u.is_super_admin || u.role === "super_admin" || u.role === "superadmin") {
      return "/platform/dashboard"
    }
    if (u.role === "support" || u.isCareAgent) return "/support/tickets"
    if (u.role === "catalog") return routes.catalog
    if (u.role === "finance") return "/customers/payments"
    return routes.dashboard
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
            element={<Navigate to={routes.login} replace />}
          />

          <Route
            path={routes.onboarding}
            element={<Navigate to={getAuthenticatedDefaultRoute(user)} replace />}
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
              user && user.role !== "customer" ? (
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
          {/* Was redirecting into the old BookingPage's hardcoded "AC Inspection"
              tab (category=hvac, a legacy id that no longer matches any real
              catalog category) -- that flow also depended on a component,
              ACInspectionFormModal.jsx, that doesn't exist in the codebase, so
              it was fully broken. ACInspectionBookingPage.jsx is a complete,
              working, self-contained replacement (real backend booking via
              estimationRepository) that was already built and lazy-imported
              above but never actually mounted on any route -- wiring it in
              here is what makes it reachable. */}
          <Route path="/ac-inspection" element={<ACInspectionBookingPage />} />
          <Route path="/ac-inspection/status/:id" element={<ACInspectionStatusPage />} />
          <Route path={routes.vegetables} element={<VegetableFullScreenPage />} />
          <Route path="/vegetables" element={<VegetableFullScreenPage />} />
          <Route path="/vegetable" element={<VegetableFullScreenPage />} />
          <Route path="/fresh-vegetables" element={<VegetableFullScreenPage />} />
          <Route path={routes.truck_booking_hosur} element={<MiniTruckBookingHosurPage />} />
          <Route path={routes.logistics_booking} element={<LogisticsBookingPage />} />
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
          <Route path="/packers-movers/hosur" element={<Navigate to="/packers-and-movers/hosur" replace />} />
          <Route path="/packers-movers" element={<Navigate to="/packers-and-movers" replace />} />
          <Route path="/booking/packers-and-movers" element={<PackersMoversBookingHosurPage />} />
          <Route path="/goods" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/transport" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/goods-and-transport" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/goods-and-transports" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/logistics" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/logistics/" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          <Route path="/booking/logistics" element={<Navigate to="/home" state={{ openGoodsModal: true }} replace />} />
          {/* HS-A-03: logged-in customer account area -- real routes, not just a
              modal reachable from the header. Each redirects into the existing
              CustomerAccountModal on /home with the matching tab pre-selected via
              location.state (same pattern as /goods, /transport above), so the tab
              switch/fetch logic already built for that modal is reused as-is instead
              of duplicating it as separate full pages. */}
          <Route path={routes.account} element={<Navigate to="/home" state={{ openAccountTab: "My Profile" }} replace />} />
          <Route path={routes.account_bookings} element={<Navigate to="/home" state={{ openAccountTab: "My Bookings" }} replace />} />
          <Route path={routes.account_addresses} element={<Navigate to="/home" state={{ openAccountTab: "Saved Addresses" }} replace />} />
          <Route path={routes.account_wallet} element={<Navigate to="/home" state={{ openAccountTab: "Wallet" }} replace />} />
          <Route path={routes.account_referral} element={<Navigate to="/home" state={{ openAccountTab: "Referral Code" }} replace />} />
          <Route path={routes.account_amc} element={<Navigate to="/home" state={{ openAccountTab: "AMC Bookings" }} replace />} />
          <Route path={routes.account_insurance} element={<Navigate to="/home" state={{ openAccountTab: "Insurance Claims" }} replace />} />
          <Route path={routes.account_notifications} element={<Navigate to="/home" state={{ openAccountTab: "Notification Settings" }} replace />} />
          <Route path={routes.account_help} element={<Navigate to="/home" state={{ openAccountTab: "Help & Support" }} replace />} />
          <Route path="/courier/two-wheeler" element={<Navigate to="/two-wheelers/hosur" replace />} />
          <Route path="/courier/twowheeler" element={<Navigate to="/two-wheelers/hosur" replace />} />
          <Route path="/courier" element={<Navigate to="/two-wheelers/hosur" replace />} />
          <Route path={routes.feedback} element={<FeedbackPage />} />
          <Route path={routes.customer_work_extension} element={<CustomerDecisionPage />} />
          <Route path="/customer/decision/:token" element={<CustomerDecisionPage />} />
          <Route path={routes.customer_quotation} element={<QuotationDecisionPage />} />
          <Route path={routes.booking_quotation} element={<QuotationDecisionPage />} />

          {/* ── Public Customer Live Tracking — secured by tracking_token query param or auth ── */}
          <Route path={routes.live_tracking} element={<LiveTrackingPage />} />
          <Route path="/track/:jobId" element={<LiveTrackingPage />} />
          <Route path="/tracking/:token" element={<LiveTrackingPage />} />

          {/* ── Public Legal & Customer Policy Routes ── */}
          <Route path={routes.terms} element={<TermsPage />} />
          <Route path={routes.terms_and_conditions} element={<TermsPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path={routes.privacy} element={<PrivacyPage />} />
          <Route path={routes.privacy_policy} element={<PrivacyPage />} />
          <Route path={routes.service_delivery} element={<ServiceDeliveryPage />} />
          <Route path={routes.service_delivery_policy} element={<ServiceDeliveryPage />} />
          <Route path={routes.cancellation_refund} element={<CancellationRefundPage />} />
          <Route path={routes.cancellation_refund_policy} element={<CancellationRefundPage />} />
          <Route path="/refund-policy" element={<CancellationRefundPage />} />
          <Route path="/cancellation-policy" element={<CancellationRefundPage />} />
          <Route path={routes.contact} element={<ContactUsPage />} />
          <Route path={routes.contact_us} element={<ContactUsPage />} />
          <Route path={routes.help} element={<HelpSupportPage />} />
          <Route path={routes.help_and_support} element={<HelpSupportPage />} />
          <Route path="/support" element={<HelpSupportPage />} />
          <Route path="/faq" element={<HelpSupportPage />} />
          <Route path="/sitemap" element={<HelpSupportPage />} />

          {/* ── Authenticated Shell ── */}
          <Route
            element={
              !user ? (
                <Navigate to={routes.login} replace />
              ) : user.role === "customer" ? (
                <Navigate to={routes.landing} replace />
              ) : (
                <AppShell />
              )
            }
          >
            {/* ── Super Admin Control Center ── */}
            <Route element={<RequireSuperAdmin />}>
              <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
              <Route path="/platform/users" element={<PlatformUsersPage />} />
              <Route path="/platform/customers" element={<PlatformCustomersPage />} />
              <Route path="/platform/rbac" element={<PlatformRBACPage />} />
              <Route path="/platform/security" element={<PlatformSecurityPage />} />
              <Route path="/platform/audit" element={<PlatformAuditPage />} />
            </Route>

            <Route
              path={routes.dashboard}
              element={
                user?.role === "customer" ? (
                  <Navigate to={routes.landing} replace />
                ) : isSuperAdmin(user) ? (
                  <Navigate to="/platform/dashboard" replace />
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
            {/* Inventory previously had no route-level check at all (any
                authenticated non-customer, including Support, could open it
                by URL) — now requires the "inventory" module like the
                backend already does on its API. */}
            <Route path={routes.inventory} element={<RequireModule module="inventory"><InventoryPage /></RequireModule>} />
            <Route path={routes.reports} element={<RequireModule module="reports"><ReportsPage /></RequireModule>} />

            {/* Profile settings */}
            <Route path={routes.settings} element={<SettingsPage />} />
            <Route path={routes.settings_profile} element={<SettingsPage section="profile" />} />
            <Route path={routes.settings_notifications} element={<SettingsPage section="notifications" />} />
            <Route path={routes.settings_preferences} element={<SettingsPage section="preferences" />} />
            <Route path={routes.settings_security} element={<SettingsPage section="security" />} />
            <Route path={routes.settings_data} element={<SettingsPage section="data" />} />

            {/* ── Admin-only routes ──
                RequireAdmin gates "must be Admin or Super Admin at all";
                RequireModule additionally gates "was THIS module actually
                granted to this Admin" (per Super Admin > Admin Management >
                Customize Access), so Admin 1 (Groceries/catalog only) can no
                longer even open Marketing or Homepage Builder by URL, and
                Admin 2 (Products/catalog only) can't open Service Requests,
                etc. Super Admin bypasses every RequireModule check. */}
            <Route element={<RequireAdmin />}>
              <Route path={routes.get_started} element={<GetStartedPage />} />
              <Route path={routes.catalog_dashboard} element={<RequireModule module="catalog"><CatalogDashboardPage /></RequireModule>} />
              <Route path={routes.catalog_categories} element={<RequireModule module="catalog"><CatalogCategoriesPage /></RequireModule>} />
              <Route path={routes.catalog_services} element={<RequireModule module="catalog"><CatalogServicesPage /></RequireModule>} />
              <Route path={routes.catalog_packages} element={<RequireModule module="catalog"><CatalogPackagesPage /></RequireModule>} />
              <Route path={routes.catalog_addons} element={<RequireModule module="catalog"><CatalogAddOnsPage /></RequireModule>} />
              <Route path={routes.catalog_recipes} element={<RequireModule module="catalog"><AdminRecipesPage /></RequireModule>} />
              <Route path={routes.catalog_recommendations} element={<RequireModule module="catalog"><AdminRecommendationsPage /></RequireModule>} />
              <Route path={routes.catalog_change_log} element={<RequireModule module="catalog"><CatalogChangeLogPage /></RequireModule>} />
              <Route path={routes.catalog_vendor_approvals} element={<RequireModule module="catalog"><CatalogVendorApprovalsPage /></RequireModule>} />
              <Route path={routes.catalog_painting_rates} element={<RequireModule module="catalog"><PaintingRateCardPage /></RequireModule>} />
              <Route path={routes.catalog_gt_pricing} element={<RequireModule module="catalog"><GTPricingPage /></RequireModule>} />
              <Route path={routes.marketing_coupons} element={<RequireModule module="marketing"><CouponsPage /></RequireModule>} />
              <Route path={routes.marketing_offers} element={<RequireModule module="marketing"><OffersPage /></RequireModule>} />
              <Route path={routes.marketing_referrals} element={<RequireModule module="marketing"><ReferralsPage /></RequireModule>} />
              <Route path={routes.admin_service_requests} element={<RequireModule module="service_requests"><ServiceRequestsPage /></RequireModule>} />
              <Route path={routes.admin_feedback} element={<RequireModule module="reviews"><FeedbackManagementPage /></RequireModule>} />
              <Route path={routes.inventory_vegetables} element={<RequireModule module="inventory"><VegetableStockAdminPage /></RequireModule>} />
              <Route path="/admin/vegetable-stock" element={<RequireModule module="inventory"><VegetableStockAdminPage /></RequireModule>} />
            </Route>

            {/* Homepage Builder edits Customer Web content that is public to
                every visitor the moment it's published, so — matching the
                "Customer Web Edit Mode is specifically for Super Admin"
                requirement — this is Super Admin-exclusive, not a module a
                Super Admin can hand out to a normal Admin. */}
            <Route element={<RequireSuperAdmin />}>
              <Route path={routes.homepage_customizer} element={<HomePageCustomizerPage />} />
            </Route>

            {/* ── Customer module — accessible by Admins AND Care Agents ── */}
            <Route element={<RequireCareAgentOrAdmin />}>
              <Route path={routes.customers_dashboard} element={<CustomersDashboardPage />} />
              <Route path={routes.customers_list} element={<CustomersListPage />} />
              <Route path={routes.customers_detail} element={<CustomerDetailPage />} />
              <Route path={routes.customers_payments} element={<CustomersPaymentsPage />} />
              <Route path={routes.customers_merges} element={<CustomerMergesPage />} />
              <Route path="/customers/bookings" element={<ServiceRequestsPage />} />
              <Route path="/customers/reschedules" element={<ServiceRequestsPage />} />
              <Route path="/customers/refunds" element={<ServiceRequestsPage />} />
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
      {/* Persistent floating "Edit Mode" switch -- one shared toggle for
          every customer-facing page (see EditModeProvider in main.jsx),
          instead of each page needing to wire in its own toggle bar. Renders
          nothing for anyone who isn't a Super Admin. */}
      <GlobalEditModeToggle />
      {/* Centralized AI Assistant Widget */}
      <AIChatWidget />
      {/* App-Wide Shared Mobile Bottom Navigation with safe area support */}
      <MobileBottomNav />
    </>
  )
}
