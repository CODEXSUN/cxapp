import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { AppError } from "@codexsun/framework/errors";
import { mailEvents } from "./mail.events.js";
import { decryptMailSecret, encryptMailSecret } from "./mail.secrets.js";
import type {
  MailAttachmentPayload,
  MailComposePayload,
  MailListFilters,
  MailMessage,
  MailRuntimeContext,
  MailSettings,
  MailSettingsPayload,
  MailStatus,
  MailSummary
} from "./mail.types.js";

export class MailRepository {
  constructor(private readonly secretKey: string) {}

  async settings(context: MailRuntimeContext): Promise<MailSettings> {
    const row = await context.database
      .selectFrom("mail_settings")
      .selectAll()
      .where("company_id", "=", context.companyId)
      .executeTakeFirst();
    return row ? toSettings(row) : defaultSettings(context.companyId);
  }

  async deliverySettings(context: MailRuntimeContext) {
    const row = await context.database
      .selectFrom("mail_settings")
      .selectAll()
      .where("company_id", "=", context.companyId)
      .executeTakeFirst();
    return row
      ? {
          ...toSettings(row),
          inboundPassword: decryptMailSecret(row.inbound_password_secret, this.secretKey),
          smtpPassword: decryptMailSecret(row.smtp_password_secret, this.secretKey)
        }
      : { ...defaultSettings(context.companyId), inboundPassword: "", smtpPassword: "" };
  }

  async saveSettings(context: MailRuntimeContext, input: MailSettingsPayload) {
    const current = await context.database
      .selectFrom("mail_settings")
      .selectAll()
      .where("company_id", "=", context.companyId)
      .executeTakeFirst();
    const smtpSecret = secretValue(
      input.smtpPassword,
      current?.smtp_password_secret,
      this.secretKey
    );
    const inboundSecret = secretValue(
      input.inboundPassword,
      current?.inbound_password_secret,
      this.secretKey
    );
    const values = {
      company_id: context.companyId,
      enabled: input.enabled,
      fallback_enabled: input.fallbackEnabled,
      from_email: clean(input.fromEmail).toLowerCase(),
      from_name: clean(input.fromName),
      inbound_enabled: input.inboundEnabled,
      inbound_host: clean(input.inboundHost),
      inbound_password_secret: inboundSecret,
      inbound_port: input.inboundPort,
      inbound_protocol: input.inboundProtocol,
      inbound_secure: input.inboundSecure,
      inbound_username: clean(input.inboundUsername),
      provider: "smtp",
      reply_to: clean(input.replyTo).toLowerCase(),
      smtp_host: clean(input.smtpHost),
      smtp_password_secret: smtpSecret,
      smtp_port: input.smtpPort,
      smtp_secure: input.smtpSecure,
      smtp_username: clean(input.smtpUsername),
      updated_by: context.actorEmail
    };
    if (input.enabled && (!values.smtp_host || !values.from_email)) {
      throw AppError.validation(
        "SMTP host and From email are required when tenant mail is enabled."
      );
    }
    if (
      input.inboundEnabled &&
      (!values.inbound_host || !values.inbound_username || !inboundSecret)
    ) {
      throw AppError.validation(
        "Inbound host, username, and password are required when inbox sync is enabled."
      );
    }
    if (current) {
      await context.database
        .updateTable("mail_settings")
        .set(values)
        .where("id", "=", current.id)
        .execute();
    } else {
      await context.database
        .insertInto("mail_settings")
        .values({ ...values, uuid: publicUuid() })
        .execute();
    }
    return this.settings(context);
  }

  async list(context: MailRuntimeContext, filters: MailListFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
    let query = context.database
      .selectFrom("mail_messages")
      .selectAll()
      .where("company_id", "=", context.companyId);
    query =
      filters.mailbox === "trash"
        ? query.where("deleted_at", "is not", null)
        : query.where("deleted_at", "is", null);
    if (filters.mailbox === "inbox") query = query.where("direction", "=", "inbound");
    if (filters.mailbox === "drafts")
      query = query.where("direction", "=", "outbound").where("status", "=", "draft");
    if (filters.mailbox === "scheduled")
      query = query
        .where("direction", "=", "outbound")
        .where("status", "=", "queued")
        .where("queued_at", ">", new Date());
    if (filters.mailbox === "sent")
      query = query.where("direction", "=", "outbound").where("status", "=", "sent");
    if (filters.mailbox === "failed")
      query = query.where("direction", "=", "outbound").where("status", "=", "failed");
    if (filters.mailbox === "outbox")
      query = query
        .where("direction", "=", "outbound")
        .where("status", "in", ["queued", "sending"]);
    if (filters.search) {
      const search = `%${filters.search.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("subject", "like", search),
          eb("from_email", "like", search),
          eb("to_json", "like", search),
          eb("message_no", "like", search)
        ])
      );
    }
    const rows = await query.orderBy("created_at", "desc").limit(limit).execute();
    return Promise.all(rows.map((row) => this.fromRow(context, row)));
  }

  async summary(context: MailRuntimeContext): Promise<MailSummary> {
    const rows = await context.database
      .selectFrom("mail_messages")
      .select(["direction", "status", "queued_at", "deleted_at"])
      .where("company_id", "=", context.companyId)
      .execute();
    const summary: MailSummary = {
      drafts: 0,
      failed: 0,
      inbox: 0,
      outbox: 0,
      scheduled: 0,
      sent: 0,
      trash: 0
    };
    for (const row of rows) {
      if (row.deleted_at) {
        summary.trash += 1;
        continue;
      }
      const direction = String(row.direction);
      const status = String(row.status);
      if (direction === "inbound") summary.inbox += 1;
      if (direction === "outbound" && status === "draft") summary.drafts += 1;
      if (direction === "outbound" && status === "sent") summary.sent += 1;
      if (status === "failed") summary.failed += 1;
      if (direction === "outbound" && ["queued", "sending", "failed"].includes(status))
        summary.outbox += 1;
      const queuedAt = dateValue(row.queued_at);
      if (status === "queued" && queuedAt && queuedAt.getTime() > Date.now())
        summary.scheduled += 1;
    }
    return summary;
  }

  async find(context: MailRuntimeContext, idOrUuid: string, includeDeleted = false) {
    const id = /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? Number(idOrUuid) : null;
    let query = context.database
      .selectFrom("mail_messages")
      .selectAll()
      .where("company_id", "=", context.companyId)
      .where(id ? "id" : "uuid", "=", id ?? idOrUuid);
    if (!includeDeleted) query = query.where("deleted_at", "is", null);
    const row = await query.executeTakeFirst();
    return row ? this.fromRow(context, row) : null;
  }

  async createOutbound(context: MailRuntimeContext, input: MailComposePayload) {
    validateRecipients(input.to, input.cc, input.bcc);
    const subject = clean(input.subject);
    if (!subject) throw AppError.validation("Mail subject is required.");
    const settings = await this.settings(context);
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime()))
      throw AppError.validation("Scheduled time is invalid.");
    const status: MailStatus = input.saveAsDraft ? "draft" : "queued";
    const result = await context.database
      .insertInto("mail_messages")
      .values({
        bcc_json: JSON.stringify(cleanAddresses(input.bcc)),
        body_html: input.bodyHtml,
        body_text: input.bodyText,
        cc_json: JSON.stringify(cleanAddresses(input.cc)),
        company_id: context.companyId,
        created_by: context.actorEmail,
        direction: "outbound",
        from_email: settings.fromEmail || context.actorEmail,
        from_name: settings.fromName,
        message_no: await this.nextMessageNo(context),
        queued_at: status === "queued" ? (scheduledAt ?? new Date()) : null,
        reply_to: settings.replyTo,
        status,
        subject,
        to_json: JSON.stringify(cleanAddresses(input.to)),
        uuid: publicUuid()
      })
      .executeTakeFirst();
    const messageId = Number(result.insertId);
    for (const attachment of input.attachments)
      await this.addAttachment(context, messageId, attachment);
    await this.addEvent(
      context,
      messageId,
      status === "draft" ? mailEvents.drafted : mailEvents.queued,
      status === "draft" ? "Mail saved as draft." : "Mail queued for delivery."
    );
    return this.find(context, String(messageId));
  }

  async importInbound(
    context: MailRuntimeContext,
    input: {
      bodyHtml: string;
      bodyText: string;
      fromEmail: string;
      fromName: string;
      providerMessageId: string;
      receivedAt: Date;
      replyTo: string;
      subject: string;
      to: string[];
    }
  ) {
    const existing = await context.database
      .selectFrom("mail_messages")
      .select("id")
      .where("provider_message_id", "=", input.providerMessageId)
      .executeTakeFirst();
    if (existing) return false;
    const result = await context.database
      .insertInto("mail_messages")
      .values({
        bcc_json: "[]",
        body_html: input.bodyHtml,
        body_text: input.bodyText,
        cc_json: "[]",
        company_id: context.companyId,
        created_at: input.receivedAt,
        created_by: "mail.sync",
        direction: "inbound",
        from_email: input.fromEmail,
        from_name: input.fromName,
        message_no: await this.nextMessageNo(context),
        provider_message_id: input.providerMessageId,
        reply_to: input.replyTo,
        status: "sent",
        subject: input.subject || "(No subject)",
        to_json: JSON.stringify(input.to),
        uuid: publicUuid()
      })
      .executeTakeFirst();
    await this.addEvent(
      context,
      Number(result.insertId),
      mailEvents.received,
      "Mail received from provider."
    );
    return true;
  }

  async markStatus(
    context: MailRuntimeContext,
    messageId: number,
    status: "sending" | "sent" | "failed",
    input: { error?: string; providerMessageId?: string } = {}
  ) {
    await context.database
      .updateTable("mail_messages")
      .set({
        error: status === "failed" ? (input.error ?? "Mail delivery failed.") : null,
        failed_at: status === "failed" ? new Date() : null,
        provider_message_id: input.providerMessageId ?? sql`provider_message_id`,
        sent_at: status === "sent" ? new Date() : sql`sent_at`,
        status
      })
      .where("id", "=", messageId)
      .execute();
    await this.addEvent(
      context,
      messageId,
      status === "sent"
        ? mailEvents.sent
        : status === "failed"
          ? mailEvents.failed
          : "mail.message.sending",
      status === "sent"
        ? "Mail sent."
        : status === "failed"
          ? (input.error ?? "Mail delivery failed.")
          : "Mail delivery started."
    );
  }

  async trash(context: MailRuntimeContext, idOrUuid: string) {
    const message = await this.requireMessage(context, idOrUuid, true);
    await context.database
      .updateTable("mail_messages")
      .set({ deleted_at: new Date() })
      .where("id", "=", message.id)
      .execute();
    await this.addEvent(context, message.id, mailEvents.trashed, "Mail moved to trash.");
    return this.requireMessage(context, idOrUuid, true);
  }

  async restore(context: MailRuntimeContext, idOrUuid: string) {
    const message = await this.requireMessage(context, idOrUuid, true);
    await context.database
      .updateTable("mail_messages")
      .set({ deleted_at: null })
      .where("id", "=", message.id)
      .execute();
    await this.addEvent(context, message.id, mailEvents.restored, "Mail restored from trash.");
    return this.requireMessage(context, idOrUuid);
  }

  async requireMessage(context: MailRuntimeContext, idOrUuid: string, includeDeleted = false) {
    const message = await this.find(context, idOrUuid, includeDeleted);
    if (!message) throw AppError.notFound("Mail message was not found.");
    return message;
  }

  private async addAttachment(
    context: MailRuntimeContext,
    messageId: number,
    input: MailAttachmentPayload
  ) {
    const base64 = input.base64.includes(",")
      ? (input.base64.split(",").at(-1) ?? "")
      : input.base64;
    const size = Buffer.from(base64, "base64").byteLength;
    if (size > 15 * 1024 * 1024)
      throw AppError.validation("Each attachment must be 15 MB or smaller.");
    await context.database
      .insertInto("mail_attachments")
      .values({
        content_base64: base64,
        file_name: safeFileName(input.fileName),
        mail_message_id: messageId,
        mime_type: clean(input.mimeType) || "application/octet-stream",
        size_bytes: size,
        uuid: publicUuid()
      })
      .execute();
  }

  private async addEvent(
    context: MailRuntimeContext,
    messageId: number,
    eventType: string,
    message: string
  ) {
    await context.database
      .insertInto("mail_events")
      .values({
        actor_email: context.actorEmail,
        event_type: eventType,
        mail_message_id: messageId,
        message,
        payload_json: "{}",
        uuid: publicUuid()
      })
      .execute();
  }

  private async fromRow(
    context: MailRuntimeContext,
    row: Record<string, unknown>
  ): Promise<MailMessage> {
    const [attachments, events] = await Promise.all([
      context.database
        .selectFrom("mail_attachments")
        .selectAll()
        .where("mail_message_id", "=", Number(row.id))
        .execute(),
      context.database
        .selectFrom("mail_events")
        .selectAll()
        .where("mail_message_id", "=", Number(row.id))
        .orderBy("created_at", "desc")
        .execute()
    ]);
    return {
      attachments: attachments.map((item) => ({
        fileName: String(item.file_name),
        id: Number(item.id),
        mimeType: String(item.mime_type),
        sizeBytes: Number(item.size_bytes),
        uuid: String(item.uuid)
      })),
      bcc: parseArray(row.bcc_json),
      bodyHtml: String(row.body_html ?? ""),
      bodyText: String(row.body_text ?? ""),
      cc: parseArray(row.cc_json),
      createdAt: iso(row.created_at),
      direction: row.direction === "inbound" ? "inbound" : "outbound",
      error: nullable(row.error),
      events: events.map((item) => ({
        createdAt: iso(item.created_at),
        eventType: String(item.event_type),
        id: Number(item.id),
        message: String(item.message),
        uuid: String(item.uuid)
      })),
      failedAt: nullableDate(row.failed_at),
      fromEmail: String(row.from_email),
      fromName: String(row.from_name ?? ""),
      id: Number(row.id),
      messageNo: String(row.message_no),
      providerMessageId: nullable(row.provider_message_id),
      queuedAt: nullableDate(row.queued_at),
      replyTo: String(row.reply_to ?? ""),
      sentAt: nullableDate(row.sent_at),
      status: status(row.status),
      subject: String(row.subject),
      to: parseArray(row.to_json),
      uuid: String(row.uuid)
    };
  }

  private async nextMessageNo(context: MailRuntimeContext) {
    const row = await context.database
      .selectFrom("mail_messages")
      .select("id")
      .orderBy("id", "desc")
      .executeTakeFirst();
    return `MAIL-${new Date().getFullYear()}-${String(Number(row?.id ?? 0) + 1).padStart(6, "0")}`;
  }
}

function toSettings(row: Record<string, unknown>): MailSettings {
  return {
    companyId: Number(row.company_id),
    enabled: Boolean(row.enabled),
    fallbackEnabled: Boolean(row.fallback_enabled),
    fromEmail: String(row.from_email ?? ""),
    fromName: String(row.from_name ?? ""),
    inboundEnabled: Boolean(row.inbound_enabled),
    inboundHost: String(row.inbound_host ?? ""),
    inboundPasswordConfigured: Boolean(row.inbound_password_secret),
    inboundPort: Number(row.inbound_port ?? 993),
    inboundProtocol: row.inbound_protocol === "pop3" ? "pop3" : "imap",
    inboundSecure: Boolean(row.inbound_secure),
    inboundUsername: String(row.inbound_username ?? ""),
    passwordConfigured: Boolean(row.smtp_password_secret),
    provider: "smtp",
    replyTo: String(row.reply_to ?? ""),
    smtpHost: String(row.smtp_host ?? ""),
    smtpPort: Number(row.smtp_port ?? 587),
    smtpSecure: Boolean(row.smtp_secure),
    smtpUsername: String(row.smtp_username ?? ""),
    updatedAt: nullableDate(row.updated_at)
  };
}

function defaultSettings(companyId: number): MailSettings {
  return {
    companyId,
    enabled: false,
    fallbackEnabled: true,
    fromEmail: "",
    fromName: "",
    inboundEnabled: false,
    inboundHost: "",
    inboundPasswordConfigured: false,
    inboundPort: 993,
    inboundProtocol: "imap",
    inboundSecure: true,
    inboundUsername: "",
    passwordConfigured: false,
    provider: "smtp",
    replyTo: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "",
    updatedAt: null
  };
}

function secretValue(next: string | undefined, current: unknown, key: string) {
  if (next === undefined || next === "********") return String(current ?? "");
  return encryptMailSecret(next, key);
}

function validateRecipients(...groups: string[][]) {
  const recipients = cleanAddresses(groups.flat());
  if (!recipients.length) throw AppError.validation("At least one recipient is required.");
  if (recipients.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw AppError.validation("One or more recipient email addresses are invalid.");
}

function cleanAddresses(values: string[]) {
  return values.map((value) => clean(value).toLowerCase()).filter(Boolean);
}
function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function safeFileName(value: string) {
  return clean(value).replace(/[/\\?%*:|"<>]/g, "-") || "attachment.bin";
}
function publicUuid() {
  return randomBytes(4).toString("hex");
}
function parseArray(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function nullable(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}
function nullableDate(value: unknown) {
  return value ? iso(value) : null;
}
function dateValue(value: unknown) {
  return value ? new Date(String(value)) : null;
}
function status(value: unknown): MailStatus {
  return value === "queued" ||
    value === "sending" ||
    value === "sent" ||
    value === "failed" ||
    value === "cancelled"
    ? value
    : "draft";
}
