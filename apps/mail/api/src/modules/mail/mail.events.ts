export const mailEvents = {
  drafted: "mail.message.drafted",
  failed: "mail.message.failed",
  queued: "mail.message.queued",
  received: "mail.message.received",
  restored: "mail.message.restored",
  sent: "mail.message.sent",
  trashed: "mail.message.trashed"
} as const;

export function createMailEvent(eventType: string, messageUuid: string, tenantId: string) {
  return { eventType, messageUuid, occurredAt: new Date().toISOString(), tenantId };
}
