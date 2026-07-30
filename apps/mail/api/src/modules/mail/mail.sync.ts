export const mailSyncPolicy = {
  conflictPolicy: "provider-message-id-wins",
  cursor: "provider received timestamp and message id",
  direction: "inbound-pull",
  scope: "tenant-company-mailbox"
} as const;

export function shouldImportInboundMessage(
  providerMessageId: string,
  knownProviderMessageIds: Set<string>
) {
  return Boolean(providerMessageId) && !knownProviderMessageIds.has(providerMessageId);
}
