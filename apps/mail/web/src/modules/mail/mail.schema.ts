import { z } from "zod";

export const mailComposeSchema = z
  .object({
    attachments: z.array(
      z.object({ base64: z.string(), fileName: z.string(), mimeType: z.string() }).strict()
    ),
    bcc: z.array(z.email()),
    bodyHtml: z.string(),
    bodyText: z.string(),
    cc: z.array(z.email()),
    saveAsDraft: z.boolean(),
    scheduledAt: z.string().nullable(),
    subject: z.string().trim().min(1, "Subject is required."),
    to: z.array(z.email()).min(1, "At least one recipient is required.")
  })
  .strict();

export const mailSettingsSchema = z
  .object({
    companyId: z.number().int().nonnegative(),
    enabled: z.boolean(),
    fallbackEnabled: z.boolean(),
    fromEmail: z.union([z.literal(""), z.email()]),
    fromName: z.string(),
    inboundEnabled: z.boolean(),
    inboundHost: z.string(),
    inboundPassword: z.string().optional(),
    inboundPort: z.number().int().positive(),
    inboundProtocol: z.enum(["imap", "pop3"]),
    inboundSecure: z.boolean(),
    inboundUsername: z.string(),
    replyTo: z.union([z.literal(""), z.email()]),
    smtpHost: z.string(),
    smtpPassword: z.string().optional(),
    smtpPort: z.number().int().positive(),
    smtpSecure: z.boolean(),
    smtpUsername: z.string()
  })
  .strict();
