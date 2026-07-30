import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@cxapp/framework/errors";
import { env } from "../../env.js";
import { hashPassword } from "../../auth/password-hash.js";
import { getTenantDatabase } from "../../database/tenant-database.js";
import { QueueManagerService } from "../queue-manager/queue-manager.service.js";
import { TenantRepository } from "../tenant/tenant.repository.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import { CredentialRecoveryRepository } from "./credential-recovery.repository.js";
import { credentialRecoveryEvents } from "./credential-recovery.events.js";
import { processCredentialRecoveryMailJob } from "./credential-recovery.worker.js";
import { passwordResetCanBeConsumed } from "./credential-recovery.sync.js";
import type { PasswordRecoveryRequest, PasswordResetPayload } from "./credential-recovery.types.js";

const acceptedMessage =
  "If the account exists, a password reset link has been sent to its email address.";
type RecoveryTarget = {
  tenantDatabase?: string;
  tenantId?: string;
  userUuid: string;
};

export class CredentialRecoveryService {
  constructor(
    private readonly repository = new CredentialRecoveryRepository(),
    private readonly tenants = new TenantRepository(),
    private readonly queue = new QueueManagerService(),
    private readonly activity = new PlatformActivityService()
  ) {}

  async request(input: PasswordRecoveryRequest) {
    const email = input.email.trim().toLowerCase();
    const target =
      input.desk === "tenant"
        ? await this.tenantTarget(input, email)
        : await this.platformTarget(input.desk, email);
    if (!target) return { accepted: true as const, message: acceptedMessage };

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
    await this.repository.createRequest({
      desk: input.desk,
      email,
      expiresAt,
      ...(target.tenantDatabase ? { tenantDatabase: target.tenantDatabase } : {}),
      ...(target.tenantId ? { tenantId: target.tenantId } : {}),
      tokenHash,
      userUuid: target.userUuid
    });
    const resetUrl = new URL("/reset-password", env.PLATFORM_WEB_ORIGIN);
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("desk", input.desk);
    await processCredentialRecoveryMailJob(
      {
        bodyHtml: `<p>We received a request to reset your CODEXSUN password.</p><p><a href="${escapeHtml(resetUrl.toString())}">Reset password</a></p><p>This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request this, ignore this message.</p>`,
        bodyText: `Reset your CODEXSUN password: ${resetUrl.toString()}\n\nThis link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request this, ignore this message.`,
        email,
        secretKey: env.JWT_SECRET,
        tenantId: target.tenantId ?? null,
        tokenHash
      },
      (job) => this.queue.enqueue(job)
    );
    await this.activity.recordActivity({
      action: credentialRecoveryEvents.requested,
      actorEmail: email,
      details: { desk: input.desk, tenantId: target.tenantId ?? null },
      moduleKey: "platform.credential-recovery",
      recordLabel: email
    });
    await this.repository.purgeExpired();
    return { accepted: true as const, message: acceptedMessage };
  }

  async reset(input: PasswordResetPayload) {
    const request = await this.repository.findActiveRequest(hashToken(input.token));
    if (!request || !passwordResetCanBeConsumed(request))
      throw AppError.validation("The password reset link is invalid or has expired.");
    if (!(await this.repository.consume(request.id))) {
      throw AppError.validation("The password reset link is invalid or has expired.");
    }
    const tenantDatabase =
      request.desk === "tenant" ? await this.resolveTrustedTenantDatabase(request) : undefined;
    if (
      !(await this.repository.updatePassword(request, hashPassword(input.password), tenantDatabase))
    ) {
      throw AppError.validation("The password reset account is no longer available.");
    }
    await this.activity.recordActivity({
      action: credentialRecoveryEvents.completed,
      actorEmail: request.email,
      details: { desk: request.desk, tenantId: request.tenantId },
      moduleKey: "platform.credential-recovery",
      recordLabel: request.email,
      recordUuid: request.uuid
    });
    return { reset: true as const };
  }

  private async tenantTarget(
    input: PasswordRecoveryRequest,
    email: string
  ): Promise<RecoveryTarget | null> {
    const corporateId = input.corporateId?.trim() ?? "";
    if (!corporateId) return null;
    const domainTenant = await this.tenants.findByDomain(input.domain);
    const corporateTenant = await this.tenants.findByCorporateId(corporateId);
    const tenant = domainTenant ?? corporateTenant;
    if (
      !tenant ||
      !corporateTenant ||
      corporateTenant.uuid !== tenant.uuid ||
      tenant.status !== "active"
    ) {
      return null;
    }
    const user = await this.tenants.findTenantUserByEmail(tenant, email);
    if (!user || user.status !== "active") return null;
    return { tenantDatabase: tenant.dbName, tenantId: tenant.uuid, userUuid: user.uuid };
  }

  private async platformTarget(
    desk: "admin" | "sa",
    email: string
  ): Promise<RecoveryTarget | null> {
    const credential = await this.repository.findPlatformCredential(
      desk === "sa" ? "super_admin" : "staff",
      email
    );
    return credential?.status === "active" ? { userUuid: credential.uuid } : null;
  }

  private async resolveTrustedTenantDatabase(request: {
    tenantDatabase: string | null;
    tenantId: string | null;
  }) {
    if (!request.tenantId || !request.tenantDatabase) return undefined;
    const tenant = await this.tenants.findByIdOrCode(request.tenantId);
    if (!tenant || tenant.status !== "active" || tenant.dbName !== request.tenantDatabase) {
      return undefined;
    }
    return getTenantDatabase(tenant);
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '"': "&quot;",
      "&": "&amp;",
      "'": "&#039;",
      "<": "&lt;",
      ">": "&gt;"
    };
    return entities[character] ?? character;
  });
}
