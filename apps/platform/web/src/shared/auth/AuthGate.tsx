import { Button } from "@cxapp/ui/components/button";
import { Card } from "@cxapp/ui/components/card";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { StatusBadge } from "@cxapp/ui/components/StatusBadge";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { restoreSession, type Desk } from "../api/platform-api";
import { redirectForExpiredSession } from "./session-expiry";

const expectedUserType: Record<Desk, string> = {
  admin: "staff",
  sa: "super_admin",
  tenant: "tenant"
};

const deskLabels: Record<Desk, string> = {
  admin: "admin",
  sa: "super admin",
  tenant: "app"
};

export function AuthGate({ children, desk }: { children: ReactElement; desk: Desk }) {
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const data = await restoreSession(desk);
        if (!cancelled) {
          const valid = data.authenticated && data.userType === expectedUserType[desk];
          if (!valid) redirectForExpiredSession(desk);
          setServerValid(valid);
        }
      } catch {
        if (!cancelled) {
          redirectForExpiredSession(desk);
          setServerValid(false);
        }
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [desk]);

  const valid = serverValid === true;

  if (valid) {
    return children;
  }

  if (serverValid === null) {
    return <GlobalLoader />;
  }

  return (
    <main className="simple-page">
      <Card title="Login required">
        <StatusBadge tone="red">Blocked</StatusBadge>
        <p style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
          You need an active {deskLabels[desk]} session to view this page.
        </p>
        <Button style={{ width: "100%" }} onClick={() => redirectForExpiredSession(desk)}>
          Go to Login
        </Button>
      </Card>
    </main>
  );
}
