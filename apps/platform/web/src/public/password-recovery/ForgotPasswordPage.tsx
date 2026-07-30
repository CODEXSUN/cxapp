import { AuthLayout, Button, Field } from "@codexsun/ui";
import { ArrowLeft, Mail } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { forgotPassword, type Desk } from "../../shared/api/platform-api";

export function ForgotPasswordPage() {
  const desk = deskFromQuery();
  const [corporateId, setCorporateId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await forgotPassword({
        ...(desk === "tenant" ? { corporateId } : {}),
        desk,
        email
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Password recovery failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout surface={desk} title="Forgot password">
      <form className="auth-form" onSubmit={submit}>
        {desk === "tenant" ? (
          <Field
            autoComplete="organization"
            className="auth-field"
            disabled={loading}
            label="Corporate ID"
            name="corporateId"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setCorporateId(event.target.value)}
            value={corporateId}
          />
        ) : null}
        <Field
          autoComplete="email"
          className="auth-field"
          disabled={loading}
          label="Email"
          name="email"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <Button disabled={loading} icon={<Mail size={16} />} type="submit">
          {loading ? "Sending..." : "Send reset link"}
        </Button>
        <Button
          disabled={loading}
          icon={<ArrowLeft size={16} />}
          type="button"
          variant="outline"
          onClick={() => window.location.assign(loginPath(desk))}
        >
          Back to sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

function deskFromQuery(): Desk {
  const desk = new URLSearchParams(window.location.search).get("desk");
  return desk === "sa" || desk === "admin" ? desk : "tenant";
}

function loginPath(desk: Desk) {
  if (desk === "sa") return "/sa/login";
  if (desk === "admin") return "/admin/login";
  return "/login";
}
