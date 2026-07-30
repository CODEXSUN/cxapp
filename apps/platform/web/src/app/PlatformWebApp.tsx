import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { Toaster } from "@cxapp/ui/components/sonner";
import { AppProviders } from "./providers";
import { router } from "./router";
import { applyDesignSystemPreference } from "./design-system";
import { PageTitle } from "../shared/document/PageTitle";
import { clearBrowserSession } from "../shared/api/platform-api";
import { installSessionExpiryInterceptor } from "../shared/auth/session-expiry";

applyDesignSystemPreference();
installSessionExpiryInterceptor(clearBrowserSession);

export function PlatformWebApp() {
  return (
    <React.StrictMode>
      <AppProviders>
        <React.Suspense fallback={<GlobalLoader />}>
          <PageTitle />
          <RouterProvider router={router} />
          <Toaster />
        </React.Suspense>
      </AppProviders>
    </React.StrictMode>
  );
}
