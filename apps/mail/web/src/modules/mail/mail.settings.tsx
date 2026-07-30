import { useEffect, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Label } from "@codexsun/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@codexsun/ui/components/select";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { mailSettingsSchema } from "./mail.schema";
import type { MailSettings, MailSettingsPayload } from "./mail.types";

export function MailSettingsForm({
  busy,
  onOpenChange,
  onSave,
  onTest,
  open,
  settings
}: {
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: MailSettingsPayload) => Promise<void>;
  onTest: (recipient: string) => Promise<void>;
  open: boolean;
  settings?: MailSettings | undefined;
}) {
  const [form, setForm] = useState<MailSettingsPayload>(() => blankSettings());
  const [error, setError] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  useEffect(() => {
    if (settings) setForm({ ...settings, inboundPassword: "", smtpPassword: "" });
  }, [settings]);

  async function save() {
    const parsed = mailSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check mail settings.");
      return;
    }
    if (form.enabled && (!form.smtpHost || !form.fromEmail)) {
      setError("SMTP host and From email are required.");
      return;
    }
    setError("");
    await onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Mail settings</DialogTitle>
          <DialogDescription>
            Tenant credentials take priority. Environment SMTP is used only when fallback is
            enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <section className="grid gap-4">
            <div>
              <h3 className="font-semibold">Outbound SMTP</h3>
              <p className="text-sm text-muted-foreground">
                Configure the selected company sender identity and delivery server.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SMTP host">
                <Input
                  value={form.smtpHost}
                  onChange={(event) => setForm({ ...form, smtpHost: event.target.value })}
                />
              </Field>
              <Field label="Port">
                <Input
                  type="number"
                  value={form.smtpPort}
                  onChange={(event) => setForm({ ...form, smtpPort: Number(event.target.value) })}
                />
              </Field>
              <Field label="Username">
                <Input
                  value={form.smtpUsername}
                  onChange={(event) => setForm({ ...form, smtpUsername: event.target.value })}
                />
              </Field>
              <Field label={settings?.passwordConfigured ? "Password (configured)" : "Password"}>
                <Input
                  type="password"
                  placeholder={
                    settings?.passwordConfigured ? "Leave blank to keep current" : "SMTP password"
                  }
                  value={form.smtpPassword ?? ""}
                  onChange={(event) => setForm({ ...form, smtpPassword: event.target.value })}
                />
              </Field>
              <Field label="From email">
                <Input
                  type="email"
                  value={form.fromEmail}
                  onChange={(event) => setForm({ ...form, fromEmail: event.target.value })}
                />
              </Field>
              <Field label="From name">
                <Input
                  value={form.fromName}
                  onChange={(event) => setForm({ ...form, fromName: event.target.value })}
                />
              </Field>
              <Field label="Reply-to">
                <Input
                  type="email"
                  value={form.replyTo}
                  onChange={(event) => setForm({ ...form, replyTo: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <WorkspaceSwitchCard
                checked={form.enabled}
                fieldLabel="Tenant SMTP"
                label={form.enabled ? "Enabled" : "Disabled"}
                description="Use this tenant configuration first."
                onCheckedChange={(enabled) => setForm({ ...form, enabled })}
              />
              <WorkspaceSwitchCard
                checked={form.smtpSecure}
                fieldLabel="Secure SMTP"
                label={form.smtpSecure ? "TLS enabled" : "STARTTLS / plain"}
                onCheckedChange={(smtpSecure) => setForm({ ...form, smtpSecure })}
              />
              <WorkspaceSwitchCard
                checked={form.fallbackEnabled}
                fieldLabel="Environment fallback"
                label={form.fallbackEnabled ? "Fallback enabled" : "Fallback disabled"}
                description="Use MAIL_* credentials when tenant delivery fails."
                onCheckedChange={(fallbackEnabled) => setForm({ ...form, fallbackEnabled })}
              />
            </div>
          </section>
          <section className="grid gap-4 border-t pt-5">
            <div>
              <h3 className="font-semibold">Inbound Inbox</h3>
              <p className="text-sm text-muted-foreground">
                IMAP is recommended for synchronized history. POP3 settings remain available for
                provider compatibility.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Protocol">
                <Select
                  value={form.inboundProtocol}
                  onValueChange={(value) =>
                    setForm({ ...form, inboundProtocol: value as "imap" | "pop3" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imap">IMAP</SelectItem>
                    <SelectItem value="pop3">POP3</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Inbound host">
                <Input
                  value={form.inboundHost}
                  onChange={(event) => setForm({ ...form, inboundHost: event.target.value })}
                />
              </Field>
              <Field label="Port">
                <Input
                  type="number"
                  value={form.inboundPort}
                  onChange={(event) =>
                    setForm({ ...form, inboundPort: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Username">
                <Input
                  value={form.inboundUsername}
                  onChange={(event) => setForm({ ...form, inboundUsername: event.target.value })}
                />
              </Field>
              <Field
                label={settings?.inboundPasswordConfigured ? "Password (configured)" : "Password"}
              >
                <Input
                  type="password"
                  placeholder={
                    settings?.inboundPasswordConfigured
                      ? "Leave blank to keep current"
                      : "Inbound password"
                  }
                  value={form.inboundPassword ?? ""}
                  onChange={(event) => setForm({ ...form, inboundPassword: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceSwitchCard
                checked={form.inboundEnabled}
                fieldLabel="Inbox sync"
                label={form.inboundEnabled ? "Enabled" : "Disabled"}
                onCheckedChange={(inboundEnabled) => setForm({ ...form, inboundEnabled })}
              />
              <WorkspaceSwitchCard
                checked={form.inboundSecure}
                fieldLabel="Secure inbound"
                label={form.inboundSecure ? "TLS enabled" : "Unencrypted"}
                onCheckedChange={(inboundSecure) => setForm({ ...form, inboundSecure })}
              />
            </div>
          </section>
          <section className="grid gap-3 border-t pt-5">
            <h3 className="font-semibold">Test delivery</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testRecipient}
                onChange={(event) => setTestRecipient(event.target.value)}
                placeholder="recipient@example.com"
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy || !testRecipient.trim()}
                onClick={() => void onTest(testRecipient)}
              >
                Send test
              </Button>
            </div>
          </section>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function blankSettings(): MailSettingsPayload {
  return {
    companyId: Number(localStorage.getItem("codexsun.tenant.company-id")) || 0,
    enabled: false,
    fallbackEnabled: true,
    fromEmail: "",
    fromName: "",
    inboundEnabled: false,
    inboundHost: "",
    inboundPassword: "",
    inboundPort: 993,
    inboundProtocol: "imap",
    inboundSecure: true,
    inboundUsername: "",
    replyTo: "",
    smtpHost: "",
    smtpPassword: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: ""
  };
}
