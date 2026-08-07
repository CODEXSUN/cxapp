import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy } from "react";

const AdminDesk = lazy(() =>
  import("../desks/admin/AdminDesk").then((module) => ({ default: module.AdminDesk }))
);
const SaDesk = lazy(() =>
  import("../desks/sa/SaDesk").then((module) => ({ default: module.SaDesk }))
);
const AppDesk = lazy(() =>
  import("../desks/tenant/AppDesk").then((module) => ({ default: module.AppDesk }))
);
const BillingPrintRoute = lazy(() =>
  import("../desks/tenant/BillingPrintRoute").then((module) => ({
    default: module.BillingPrintRoute
  }))
);
const HealthPage = lazy(() =>
  import("../public/health/HealthPage").then((module) => ({ default: module.HealthPage }))
);
const TenantHome = lazy(() =>
  import("../public/tenant-home").then((module) => ({
    default: module.TenantHome
  }))
);
const TenantWorkspacePage = lazy(() =>
  import("../public/tenant-site/pages/workspace.page").then((module) => ({
    default: module.TenantWorkspacePage
  }))
);
const TenantFeaturesPage = lazy(() =>
  import("../public/tenant-site/pages/features.page").then((module) => ({
    default: module.TenantFeaturesPage
  }))
);
const TenantSecurityPage = lazy(() =>
  import("../public/tenant-site/pages/security.page").then((module) => ({
    default: module.TenantSecurityPage
  }))
);
const TenantBlogPage = lazy(() =>
  import("../public/tenant-site/pages/blog.page").then((module) => ({
    default: module.TenantBlogPage
  }))
);
const TenantUpdatesPage = lazy(() =>
  import("../public/tenant-site/pages/updates.page").then((module) => ({
    default: module.TenantUpdatesPage
  }))
);
const TenantAboutPage = lazy(() =>
  import("../public/tenant-site/pages/about.page").then((module) => ({
    default: module.TenantAboutPage
  }))
);
const TenantContactPage = lazy(() =>
  import("../public/tenant-site/pages/contact.page").then((module) => ({
    default: module.TenantContactPage
  }))
);
const TenantPrivacyPage = lazy(() =>
  import("../public/tenant-site/pages/privacy.page").then((module) => ({
    default: module.TenantPrivacyPage
  }))
);
const TenantTermsPage = lazy(() =>
  import("../public/tenant-site/pages/terms.page").then((module) => ({
    default: module.TenantTermsPage
  }))
);
const LoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const SessionRefreshPage = lazy(() =>
  import("../public/session-refresh").then((module) => ({ default: module.SessionRefreshPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("../public/password-recovery").then((module) => ({
    default: module.ForgotPasswordPage
  }))
);
const ResetPasswordPage = lazy(() =>
  import("../public/password-recovery").then((module) => ({
    default: module.ResetPasswordPage
  }))
);
const rootRoute = createRootRoute();

const homeRoute = createRoute({
  component: TenantHome,
  getParentRoute: () => rootRoute,
  path: "/"
});

const workspaceRoute = createRoute({
  component: TenantWorkspacePage,
  getParentRoute: () => rootRoute,
  path: "/workspace"
});

const featuresRoute = createRoute({
  component: TenantFeaturesPage,
  getParentRoute: () => rootRoute,
  path: "/features"
});

const securityRoute = createRoute({
  component: TenantSecurityPage,
  getParentRoute: () => rootRoute,
  path: "/security"
});

const blogRoute = createRoute({
  component: TenantBlogPage,
  getParentRoute: () => rootRoute,
  path: "/blog"
});

const updatesRoute = createRoute({
  component: TenantUpdatesPage,
  getParentRoute: () => rootRoute,
  path: "/updates"
});

const aboutRoute = createRoute({
  component: TenantAboutPage,
  getParentRoute: () => rootRoute,
  path: "/about"
});

const contactRoute = createRoute({
  component: TenantContactPage,
  getParentRoute: () => rootRoute,
  path: "/contact"
});

const privacyRoute = createRoute({
  component: TenantPrivacyPage,
  getParentRoute: () => rootRoute,
  path: "/privacy"
});

const termsRoute = createRoute({
  component: TenantTermsPage,
  getParentRoute: () => rootRoute,
  path: "/terms"
});

const healthRoute = createRoute({
  component: HealthPage,
  getParentRoute: () => rootRoute,
  path: "/status"
});

const tenantLoginRoute = createRoute({
  component: () => <LoginPage desk="tenant" title="App Login" />,
  getParentRoute: () => rootRoute,
  path: "/login"
});

const saLoginRoute = createRoute({
  component: () => <LoginPage desk="sa" title="Super Admin Login" />,
  getParentRoute: () => rootRoute,
  path: "/sa/login"
});

const saRefreshRoute = createRoute({
  component: SessionRefreshPage,
  getParentRoute: () => rootRoute,
  path: "/sa/refresh"
});

const adminLoginRoute = createRoute({
  component: () => <LoginPage desk="admin" title="Staff Admin Login" />,
  getParentRoute: () => rootRoute,
  path: "/admin/login"
});

const forgotPasswordRoute = createRoute({
  component: ForgotPasswordPage,
  getParentRoute: () => rootRoute,
  path: "/forgot-password"
});

const resetPasswordRoute = createRoute({
  component: ResetPasswordPage,
  getParentRoute: () => rootRoute,
  path: "/reset-password"
});

const saSplatRoute = createRoute({
  component: SaDesk,
  getParentRoute: () => rootRoute,
  path: "/sa/$"
});

const adminRoute = createRoute({
  component: AdminDesk,
  getParentRoute: () => rootRoute,
  path: "/admin"
});

const quotationPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="quotation" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/quotation/print"
});

const salesPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="sales" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/sales/print"
});

const purchasePrintRoute = createRoute({
  component: () => <BillingPrintRoute document="purchase" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/purchase/print"
});

const exportSalesPrintRoute = createRoute({
  component: () => <BillingPrintRoute document="export-sales" />,
  getParentRoute: () => rootRoute,
  path: "/app/billing/export-sales/print"
});

const appSplatRoute = createRoute({
  component: AppDesk,
  getParentRoute: () => rootRoute,
  path: "/app/$"
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  workspaceRoute,
  featuresRoute,
  securityRoute,
  blogRoute,
  updatesRoute,
  aboutRoute,
  contactRoute,
  privacyRoute,
  termsRoute,
  healthRoute,
  tenantLoginRoute,
  saLoginRoute,
  saRefreshRoute,
  adminLoginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  saSplatRoute,
  adminRoute,
  quotationPrintRoute,
  salesPrintRoute,
  purchasePrintRoute,
  exportSalesPrintRoute,
  appSplatRoute
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
