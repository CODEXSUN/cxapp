import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { MailService } from "./mail.service.js";
import type { MailListFilters, MailModuleDependencies } from "./mail.types.js";

const mailboxSchema = z.enum(["inbox", "outbox", "drafts", "scheduled", "sent", "failed", "trash"]);
const attachmentSchema = z
  .object({
    base64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120)
  })
  .strict();
const composeSchema = z
  .object({
    attachments: z.array(attachmentSchema).max(10).default([]),
    bcc: z.array(z.email()).max(50).default([]),
    bodyHtml: z.string().default(""),
    bodyText: z.string().default(""),
    cc: z.array(z.email()).max(50).default([]),
    saveAsDraft: z.boolean().default(false),
    scheduledAt: z.iso.datetime().nullable().default(null),
    subject: z.string().trim().min(1).max(500),
    to: z.array(z.email()).max(50).default([])
  })
  .strict();
const settingsPayloadSchema = z
  .object({
    companyId: z.number().int().nonnegative(),
    enabled: z.boolean(),
    fallbackEnabled: z.boolean(),
    fromEmail: z.union([z.literal(""), z.email()]),
    fromName: z.string().max(191),
    inboundEnabled: z.boolean(),
    inboundHost: z.string().max(191),
    inboundPassword: z.string().optional(),
    inboundPort: z.number().int().positive().max(65535),
    inboundProtocol: z.enum(["imap", "pop3"]),
    inboundSecure: z.boolean(),
    inboundUsername: z.string().max(191),
    replyTo: z.union([z.literal(""), z.email()]),
    smtpHost: z.string().max(191),
    smtpPassword: z.string().optional(),
    smtpPort: z.number().int().positive().max(65535),
    smtpSecure: z.boolean(),
    smtpUsername: z.string().max(191)
  })
  .strict();
const idSchema = z.object({ id: z.string().min(1).max(80) }).strict();
const settingsResponseSchema = z
  .object({
    companyId: z.number(),
    enabled: z.boolean(),
    fallbackEnabled: z.boolean(),
    fromEmail: z.string(),
    fromName: z.string(),
    inboundEnabled: z.boolean(),
    inboundHost: z.string(),
    inboundPasswordConfigured: z.boolean(),
    inboundPort: z.number(),
    inboundProtocol: z.enum(["imap", "pop3"]),
    inboundSecure: z.boolean(),
    inboundUsername: z.string(),
    passwordConfigured: z.boolean(),
    provider: z.literal("smtp"),
    replyTo: z.string(),
    smtpHost: z.string(),
    smtpPort: z.number(),
    smtpSecure: z.boolean(),
    smtpUsername: z.string(),
    updatedAt: z.string().nullable()
  })
  .strict();
const mailMessageSchema = z
  .object({
    attachments: z.array(
      z
        .object({
          fileName: z.string(),
          id: z.number(),
          mimeType: z.string(),
          sizeBytes: z.number(),
          uuid: z.string()
        })
        .strict()
    ),
    bcc: z.array(z.string()),
    bodyHtml: z.string(),
    bodyText: z.string(),
    cc: z.array(z.string()),
    createdAt: z.string(),
    direction: z.enum(["inbound", "outbound"]),
    error: z.string().nullable(),
    events: z.array(
      z
        .object({
          createdAt: z.string(),
          eventType: z.string(),
          id: z.number(),
          message: z.string(),
          uuid: z.string()
        })
        .strict()
    ),
    failedAt: z.string().nullable(),
    fromEmail: z.string(),
    fromName: z.string(),
    id: z.number(),
    messageNo: z.string(),
    providerMessageId: z.string().nullable(),
    queuedAt: z.string().nullable(),
    replyTo: z.string(),
    sentAt: z.string().nullable(),
    status: z.enum(["draft", "queued", "sending", "sent", "failed", "cancelled"]),
    subject: z.string(),
    to: z.array(z.string()),
    uuid: z.string()
  })
  .strict();
const queueJobSchema = z.unknown();

export function registerMailRoutes(app: FastifyInstance, dependencies: MailModuleDependencies) {
  const service = new MailService(dependencies);
  registerContractRoute(app, {
    method: "GET",
    url: "/mail/settings",
    schemas: { response: settingsResponseSchema },
    handler: ({ request }) => service.settings(request)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/mail/settings",
    schemas: { body: settingsPayloadSchema, response: settingsResponseSchema },
    handler: ({ body, request }) => service.saveSettings(request, body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/mail/summary",
    schemas: { response: z.record(z.string(), z.number()) },
    handler: ({ request }) => service.summary(request)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/mail/messages",
    schemas: {
      querystring: z
        .object({
          limit: z.coerce.number().int().positive().max(200).optional(),
          mailbox: mailboxSchema.optional(),
          search: z.string().optional()
        })
        .strict(),
      response: z.array(mailMessageSchema)
    },
    handler: ({ query, request }) => service.list(request, listFilters(query))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/mail/messages/:id",
    schemas: { params: idSchema, response: mailMessageSchema },
    handler: ({ params, request }) => service.get(request, params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/mail/messages",
    schemas: { body: composeSchema, response: mailMessageSchema },
    handler: ({ body, request }) => service.compose(request, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/mail/test",
    schemas: {
      body: z.object({ recipient: z.union([z.literal(""), z.email()]) }).strict(),
      response: mailMessageSchema
    },
    handler: ({ body, request }) => service.test(request, body.recipient)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/mail/sync",
    schemas: { response: queueJobSchema },
    handler: ({ request }) => service.sync(request)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/mail/messages/:id/trash",
    schemas: { params: idSchema, response: mailMessageSchema },
    handler: ({ params, request }) => service.trash(request, params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/mail/messages/:id/restore",
    schemas: { params: idSchema, response: mailMessageSchema },
    handler: ({ params, request }) => service.restore(request, params.id)
  });
}

function listFilters(input: {
  limit?: number | undefined;
  mailbox?: MailListFilters["mailbox"] | undefined;
  search?: string | undefined;
} | undefined): MailListFilters {
  return {
    ...(input?.limit !== undefined ? { limit: input.limit } : {}),
    ...(input?.mailbox !== undefined ? { mailbox: input.mailbox } : {}),
    ...(input?.search !== undefined ? { search: input.search } : {})
  };
}
