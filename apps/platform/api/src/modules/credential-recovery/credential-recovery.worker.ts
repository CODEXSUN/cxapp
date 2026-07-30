import type { QueueJobPayload } from "../queue-manager/queue-manager.types.js";
import { sealSystemMailPayload } from "@cxapp/mail-api";

export function buildPasswordResetMailJob(input: {
  bodyHtml: string;
  bodyText: string;
  email: string;
  secretKey: string;
  tenantId: string | null;
  tokenHash: string;
}): QueueJobPayload {
  return {
    actorEmail: "password-recovery@codexsun.app",
    correlationId: `password-reset:${input.tokenHash.slice(0, 16)}`,
    idempotencyKey: `password-reset:${input.tokenHash}`,
    jobName: "mail.system-send",
    maxAttempts: 3,
    payload: sealSystemMailPayload(
      {
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        subject: "Reset your CODEXSUN password",
        to: [input.email]
      },
      input.secretKey
    ),
    queueName: "mail",
    sourceModule: "platform.credential-recovery",
    tenantId: input.tenantId
  };
}

export function processCredentialRecoveryMailJob(
  input: Parameters<typeof buildPasswordResetMailJob>[0],
  enqueue: (job: QueueJobPayload) => Promise<unknown>
) {
  return enqueue(buildPasswordResetMailJob(input));
}
