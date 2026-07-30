import { AppError } from "@codexsun/framework/errors";
import { migrateMailModule } from "./mail.migration.js";
import { MailRepository } from "./mail.repository.js";
import { seedMailModule } from "./mail.seed.js";
import type {
  MailComposePayload,
  MailListFilters,
  MailModuleDependencies,
  MailRuntimeContext,
  MailSettingsPayload
} from "./mail.types.js";

const migratedDatabases = new Set<string>();

export class MailService {
  private readonly repository: MailRepository;

  constructor(private readonly dependencies: MailModuleDependencies) {
    this.repository = new MailRepository(dependencies.secretKey);
  }

  async context(request: Parameters<MailModuleDependencies["resolveContext"]>[0]) {
    const context = await this.dependencies.resolveContext(request);
    if (!migratedDatabases.has(context.tenantDatabase)) {
      await migrateMailModule(context.database);
      await seedMailModule(context.database);
      migratedDatabases.add(context.tenantDatabase);
    }
    await context.authorize("mail.manage");
    return context;
  }

  async settings(request: Parameters<MailModuleDependencies["resolveContext"]>[0]) {
    return this.repository.settings(await this.context(request));
  }

  async saveSettings(
    request: Parameters<MailModuleDependencies["resolveContext"]>[0],
    input: MailSettingsPayload
  ) {
    return this.repository.saveSettings(await this.context(request), input);
  }

  async list(
    request: Parameters<MailModuleDependencies["resolveContext"]>[0],
    filters: MailListFilters
  ) {
    return this.repository.list(await this.context(request), filters);
  }

  async summary(request: Parameters<MailModuleDependencies["resolveContext"]>[0]) {
    return this.repository.summary(await this.context(request));
  }

  async get(request: Parameters<MailModuleDependencies["resolveContext"]>[0], id: string) {
    return this.repository.requireMessage(await this.context(request), id, true);
  }

  async compose(
    request: Parameters<MailModuleDependencies["resolveContext"]>[0],
    input: MailComposePayload
  ) {
    const context = await this.context(request);
    const message = await this.repository.createOutbound(context, input);
    if (!message) throw AppError.internal("Mail message was not created.");
    if (message.status === "queued")
      await this.enqueueSend(context, message.uuid, message.queuedAt);
    return message;
  }

  async test(request: Parameters<MailModuleDependencies["resolveContext"]>[0], recipient: string) {
    const context = await this.context(request);
    const settings = await this.repository.settings(context);
    const to = recipient.trim() || settings.replyTo || settings.fromEmail || context.actorEmail;
    return this.compose(request, {
      attachments: [],
      bcc: [],
      bodyHtml: "<p>Your CODEXSUN mail configuration is working.</p>",
      bodyText: "Your CODEXSUN mail configuration is working.",
      cc: [],
      saveAsDraft: false,
      scheduledAt: null,
      subject: "CODEXSUN mail delivery test",
      to: [to]
    });
  }

  async sync(request: Parameters<MailModuleDependencies["resolveContext"]>[0]) {
    const context = await this.context(request);
    const settings = await this.repository.settings(context);
    if (!settings.inboundEnabled) throw AppError.validation("Inbound mail sync is not enabled.");
    return this.dependencies.enqueue({
      actorEmail: context.actorEmail,
      idempotencyKey: `mail.sync:${context.tenantDatabase}:${context.companyId}:${Math.floor(Date.now() / 60000)}`,
      jobName: "mail.sync",
      maxAttempts: 3,
      payload: {
        companyId: context.companyId,
        tenantDatabase: context.tenantDatabase,
        tenantId: context.tenantId
      },
      queueName: "mail",
      sourceModule: "mail",
      tenantId: context.tenantId
    });
  }

  async trash(request: Parameters<MailModuleDependencies["resolveContext"]>[0], id: string) {
    return this.repository.trash(await this.context(request), id);
  }

  async restore(request: Parameters<MailModuleDependencies["resolveContext"]>[0], id: string) {
    return this.repository.restore(await this.context(request), id);
  }

  private enqueueSend(
    context: MailRuntimeContext,
    messageUuid: string,
    availableAt: string | null
  ) {
    return this.dependencies.enqueue({
      actorEmail: context.actorEmail,
      ...(availableAt ? { availableAt } : {}),
      idempotencyKey: `mail.send:${context.tenantDatabase}:${messageUuid}`,
      jobName: "mail.send",
      maxAttempts: 3,
      payload: {
        companyId: context.companyId,
        messageUuid,
        tenantDatabase: context.tenantDatabase,
        tenantId: context.tenantId
      },
      queueName: "mail",
      sourceModule: "mail",
      tenantId: context.tenantId
    });
  }
}
