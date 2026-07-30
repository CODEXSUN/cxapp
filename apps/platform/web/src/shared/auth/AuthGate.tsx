import { Button } from "@codexsun/ui/components/button";
import { Card } from "@codexsun/ui/components/card";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { StatusBadge } from "@codexsun/ui/components/StatusBadge";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { restoreSession, type Desk } from "../api/platform-api";

const expectedUserType: Record<Desk, string> = {
  admin: "staff",
  sa: "super_admin",
  tenant: "tenant"
};

const loginPaths: Record<Desk, string> = {
  admin: "/admin/login",
  sa: "/sa/login",
  tenant: "/login"
};

const deskLabels: Record<Desk, string> = {
  admin: "admin",
  sa: "super admin",
  tenant: "app"
};

export function AuthGate({ children, desk }: { children: ReactElement; desk: Desk }) {
  const navigate = useNavigate();
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const data = await restoreSession(desk);
        if (!cancelled) {
          setServerValid(
            data.authenticated && data.userType === expectedUserType[desk]
          );
        }
      } catch {
        if (!cancelled) setServerValid(false);
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
        <Button style={{ width: "100%" }} onClick={() => navigate({ to: loginPaths[desk] })}>
          Go to Login
        </Button>
      </Card>
    </main>
  );
}
