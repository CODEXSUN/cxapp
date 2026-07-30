export const credentialRecoveryEvents = {
  completed: "auth.password-reset.completed",
  requested: "auth.password-reset.requested"
} as const;

export function createCredentialRecoveryEvent(
  type: keyof typeof credentialRecoveryEvents,
  input: { desk: string; email: string; tenantId?: string | null }
) {
  return {
    eventName: credentialRecoveryEvents[type],
    occurredAt: new Date().toISOString(),
    payload: input
  };
}
