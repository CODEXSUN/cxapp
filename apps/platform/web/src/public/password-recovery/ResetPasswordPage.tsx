import { AuthLayout, Button, Field } from "@codexsun/ui";
import { KeyRound } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { resetPassword, type Desk } from "../../shared/api/platform-api";

export function ResetPasswordPage() {
  const query = new URLSearchParams(window.location.search);
  const desk = normalizeDesk(query.get("desk"));
  const token = query.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await resetPassword({ password, token });
      window.location.assign(loginPath(desk));
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout surface={desk} title="Reset password">
      <form className="auth-form" onSubmit={submit}>
        <Field
          autoComplete="new-password"
          className="auth-field"
          disabled={loading}
          label="New password"
          name="password"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <Field
          autoComplete="new-password"
          className="auth-field"
          disabled={loading}
          label="Confirm password"
          name="confirmation"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmation(event.target.value)}
          type="password"
          value={confirmation}
        />
        <p className="text-xs text-muted-foreground">
          Use at least 12 characters with uppercase, lowercase, and a number.
        </p>
        {message ? <p className="form-error">{message}</p> : null}
        <Button disabled={loading || !token} icon={<KeyRound size={16} />} type="submit">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function normalizeDesk(value: string | null): Desk {
  return value === "sa" || value === "admin" ? value : "tenant";
}

function loginPath(desk: Desk) {
  if (desk === "sa") return "/sa/login";
  if (desk === "admin") return "/admin/login";
  return "/login";
}
