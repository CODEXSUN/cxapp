import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { resetBrowserSession } from "../../shared/api/platform-api";

const refreshedLoginPath = "/sa/login?reason=session-refreshed";

export function SessionRefreshPage() {
  const queryClient = useQueryClient();
  const refreshStarted = useRef(false);

  useEffect(() => {
    if (refreshStarted.current) return;
    refreshStarted.current = true;

    async function refreshSession() {
      try {
        await queryClient.cancelQueries();
        queryClient.clear();
        await resetBrowserSession();
      } catch {
        // The login route also replaces an invalid cookie if the reset request is unavailable.
      } finally {
        queryClient.clear();
        window.location.replace(refreshedLoginPath);
      }
    }

    void refreshSession();
  }, [queryClient]);

  return <GlobalLoader />;
}
