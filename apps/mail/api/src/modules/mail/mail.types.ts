import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";

export type MailStatus = "draft" | "queued" | "sending" | "sent" | "failed" | "cancelled";
export type MailDirection = "inbound" | "outbound";
export type MailMailbox = "inbox" | "outbox" | "drafts" | "scheduled" | "sent" | "failed" | "trash";
export type MailProvider = "smtp";

export type MailRuntimeContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  companyId: number;
  database: Kysely<Record<string, Record<string, unknown>>>;
  tenantDatabase: string;
  tenantId: string;
};

export type MailQueuePayload = {
  actorEmail?: string;
  availableAt?: string;
  correlationId?: string;
  idempotencyKey?: string;
  jobName: "mail.send" | "mail.sync" | "mail.system-send";
  maxAttempts?: number;
  payload: Record<string, unknown>;
  priority?: number;
  queueName: "mail";
  sourceModule: "mail";
  tenantId?: string | null;
};

export type MailModuleDependencies = {
  enqueue: (payload: MailQueuePayload) => Promise<unknown>;
  resolveContext: (request: FastifyRequest) => MailRuntimeContext | Promise<MailRuntimeContext>;
  secretKey: string;
};

export type MailFallbackSettings = {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  host: string;
  password: string;
  port: number;
  replyTo: string;
  secure: boolean;
  username: string;
};

export type MailWorkerDependencies = {
  database?: Kysely<Record<string, Record<string, unknown>>>;
  fallback: MailFallbackSettings;
  secretKey: string;
};

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
  provider: MailProvider;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  updatedAt: string | null;
};

export type MailSettingsPayload = Omit<
  MailSettings,
  "inboundPasswordConfigured" | "passwordConfigured" | "updatedAt"
> & {
  inboundPassword?: string | undefined;
  smtpPassword?: string | undefined;
};

export type MailAttachmentPayload = {
  base64: string;
  fileName: string;
  mimeType: string;
};

export type MailComposePayload = {
  attachments: MailAttachmentPayload[];
  bcc: string[];
  bodyHtml: string;
  bodyText: string;
  cc: string[];
  saveAsDraft: boolean;
  scheduledAt: string | null;
  subject: string;
  to: string[];
};

export type MailListFilters = {
  limit?: number;
  mailbox?: MailMailbox;
  search?: string;
};

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
  direction: MailDirection;
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

export type MailSummary = Record<MailMailbox, number>;
