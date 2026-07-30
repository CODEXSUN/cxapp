export type Mailbox = "inbox" | "outbox" | "drafts" | "scheduled" | "sent" | "failed" | "trash";
export type MailStatus = "draft" | "queued" | "sending" | "sent" | "failed" | "cancelled";

export type MailAttachment = {
  fileName: string;
  id: number;
  mimeType: string;
  sizeBytes: number;
  uuid: string;
};
export type MailEvent = {
  createdAt: string;
  eventType: string;
  id: number;
  message: string;
  uuid: string;
};
export type MailMessage = {
  attachments: MailAttachment[];
  bcc: string[];
  bodyHtml: string;
  bodyText: string;
  cc: string[];
  createdAt: string;
  direction: "inbound" | "outbound";
  error: string | null;
  events: MailEvent[];
  failedAt: string | null;
  fromEmail: string;
  fromName: string;
  id: number;
  messageNo: string;
  providerMessageId: string | null;
  queuedAt: string | null;
  replyTo: string;
  sentAt: string | null;
  status: MailStatus;
  subject: string;
  to: string[];
  uuid: string;
};
export type MailSummary = Record<Mailbox, number>;
export type MailSettings = {
  companyId: number;
  enabled: boolean;
  fallbackEnabled: boolean;
  fromEmail: string;
  fromName: string;
  inboundEnabled: boolean;
  inboundHost: string;
  inboundPasswordConfigured: boolean;
  inboundPort: number;
  inboundProtocol: "imap" | "pop3";
  inboundSecure: boolean;
  inboundUsername: string;
  passwordConfigured: boolean;
  provider: "smtp";
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  updatedAt: string | null;
};
export type MailSettingsPayload = Omit<
  MailSettings,
  "inboundPasswordConfigured" | "passwordConfigured" | "provider" | "updatedAt"
> & { inboundPassword?: string; smtpPassword?: string };
export type MailComposePayload = {
  attachments: Array<{ base64: string; fileName: string; mimeType: string }>;
  bcc: string[];
  bodyHtml: string;
  bodyText: string;
  cc: string[];
  saveAsDraft: boolean;
  scheduledAt: string | null;
  subject: string;
  to: string[];
};
