import { useNavigate } from "@tanstack/react-router";
import { AuthLayout, Button, Field } from "@cxapp/ui";
import { LogIn } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  developmentTenantLogin,
  type Desk,
  getTenantLoginContext,
  login
} from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import {
  hasSessionExpiredReason,
  hasSessionRefreshedReason
} from "../../shared/auth/session-expiry";

type LoginPageProps = {
  desk: Desk;
  title: string;
};

export function LoginPage({ desk, title }: LoginPageProps) {
  const navigate = useNavigate();
  const [corporateId, setCorporateId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantContext, setTenantContext] = useState<{
    corporateIdRequired: boolean;
    mode: "custom_domain" | "shared_domain" | "unknown";
    tenantName: string | null;
  } | null>(null);
  const autoLoginStarted = useRef(false);
  const sessionExpired = hasSessionExpiredReason(window.location.search);
  const sessionRefreshed = hasSessionRefreshedReason(window.location.search);

  const targetPath = useMemo(() => {
    if (desk === "sa") {
      return "/sa/$";
    }

    if (desk === "admin") {
      return "/admin";
    }

    return "/app/$";
  }, [desk]);

  useEffect(() => {
    if (desk !== "tenant") return;
    void getTenantLoginContext()
      .then(setTenantContext)
      .catch(() => setMessage("Unable to verify this application domain."));
  }, [desk]);

  useEffect(() => {
    if (
      desk !== "tenant" ||
      requiredClientEnv("VITE_DEV_AUTO_TENANT_LOGIN") !== "1" ||
      autoLoginStarted.current
    ) {
      return;
    }

    autoLoginStarted.current = true;
    setLoading(true);
    setMessage("");
    void developmentTenantLogin()
      .then((result) => {
        if (!result.success) {
          setMessage(result.error.message);
          return;
        }
        window.location.assign("/app/");
      })
      .catch(() => setMessage("Development auto-login failed."))
      .finally(() => setLoading(false));
  }, [desk, navigate, targetPath]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (desk === "tenant") {
      if (!tenantContext) {
        setMessage("Unable to verify this application domain.");
        return;
      }
      if (tenantContext.mode === "unknown") {
        setMessage("This domain is not mapped to an active tenant.");
        return;
      }
      if (!corporateId.trim()) {
        setMessage("Corporate ID is required to select your workspace.");
        return;
      }
    }
    setLoading(true);
    setMessage("");

    try {
      const result = await login({
        ...(desk === "tenant" ? { corporateId: corporateId.trim() } : {}),
        desk,
        email,
        password
      });

      if (!result.success) {
        setMessage(result.error?.message ?? "Login failed");
        return;
      }

      if (desk === "tenant") {
        // A tenant switch must start with a fresh query cache so records and
        // runtime metadata from the previous tenant cannot survive navigation.
        window.location.assign("/app/");
        return;
      }

      await navigate({ to: targetPath });
    } catch {
      setMessage("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      afterCard={
        sessionExpired || sessionRefreshed ? (
          <p className="auth-session-badge" role="status">
            {sessionRefreshed
              ? "Session data was cleared. Sign in again."
              : "Session expired. Please sign in again."}
          </p>
        ) : null
      }
      surface={desk}
      title={title}
    >
      <form className="auth-form" onSubmit={submit}>
        {desk === "tenant" && tenantContext?.tenantName ? (
          <p className="auth-workspace">{tenantContext.tenantName}</p>
        ) : null}
        {desk === "tenant" ? (
          <Field
            autoComplete="organization"
            className="auth-field"
            label="Corporate ID"
            name="corporateId"
            disabled={loading}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setCorporateId(event.target.value)}
            required
            value={corporateId}
          />
        ) : null}
        <Field
          autoComplete="email"
          className="auth-field"
          label="Email"
          name="email"
          disabled={loading}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        <Field
          autoComplete="current-password"
          className="auth-field"
          label="Password"
          name="password"
          disabled={loading}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <Button
          disabled={loading}
          type="button"
          variant="ghost"
          onClick={() => window.location.assign(`/forgot-password?desk=${desk}`)}
        >
          Forgot password?
        </Button>
        {message ? <p className="form-error">{message}</p> : null}
        <Button
          disabled={
            loading || (desk === "tenant" && (!tenantContext || tenantContext.mode === "unknown"))
          }
          icon={<LogIn size={16} />}
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
