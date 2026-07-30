import type { PasswordResetRequestRecord } from "./credential-recovery.types.js";

export function passwordResetCanBeConsumed(request: PasswordResetRequestRecord, now = new Date()) {
  return request.consumedAt === null && request.expiresAt.getTime() > now.getTime();
}
