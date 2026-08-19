import { AppError } from "@cxapp/framework/errors";

export type AccountingSyncDirection = "push" | "pull";
export type AccountingSyncDecision = {
  conflictPolicy: "apply" | "reject";
  direction: AccountingSyncDirection;
  entity: "account" | "journal";
  id: string;
  reason: string;
};

export function decideAccountingSync(
  entity: "account" | "journal",
  id: string,
  options: { direction?: AccountingSyncDirection; conflictPolicy?: "apply" | "reject" } = {}
): AccountingSyncDecision {
  const entityName = entity === "journal" ? "Journal entry" : "Ledger account";
  if (options.direction && options.direction !== "push")
    throw AppError.validation("Accounting records only sync outbound as push operations.");
  return {
    conflictPolicy: options.conflictPolicy ?? "reject",
    direction: "push",
    entity,
    id,
    reason: `${entityName} ${id} syncs outbound; conflicts are rejected to preserve posted integrity.`
  };
}

export const accountingSyncScope = {
  conflictPolicy: "reject" as const,
  direction: "push" as const,
  entities: ["account", "journal"] as const,
  reason:
    "Posted journal entries and ledger balances are authoritative and never merged inbound from a device."
};