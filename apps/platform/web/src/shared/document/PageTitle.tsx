import { useEffect } from "react";

const tenantDisplayName = import.meta.env.VITE_TENANT_NAME ?? "Codexsun";

export function setPlatformDocumentTitle(pageTitle: string) {
  document.title = `${tenantDisplayName} | ${pageTitle}`;
}

const pageTitles: Record<string, string> = {
  "/": "App Portal",
  "/admin": "Admin Desk",
  "/admin/login": "Staff Admin Login",
  "/app": "Application Desk",
  "/login": "App Login",
  "/sa": "Super Admin Desk",
  "/sa/login": "Super Admin Login",
  "/status": "Status",
  "/workspace": "Dashboard"
};

function resolvePageTitle(pathname: string) {
  if (pathname.startsWith("/sa/") && pathname !== "/sa/login") {
    return pathname === "/sa/task-manager" ? "Task Manager" : "Super Admin Desk";
  }
  if (pathname.startsWith("/app/")) {
    return "Application Desk";
  }
  return pageTitles[pathname] ?? "Dashboard";
}

export function PageTitle() {
  useEffect(() => {
    const updateTitle = () => {
      if (window.location.pathname.startsWith("/app/")) return;
      setPlatformDocumentTitle(resolvePageTitle(window.location.pathname));
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      updateTitle();
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      updateTitle();
    };

    window.addEventListener("popstate", updateTitle);
    updateTitle();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", updateTitle);
    };
  }, []);

  return null;
}
