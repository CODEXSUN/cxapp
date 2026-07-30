import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "./platform-database.js";

export async function recordTenantAccessAudit(input: {
  action: string;
  actorEmail: string;
  moduleKey: string;
  recordId: number;
  recordLabel: string;
  recordUuid: string;
  tenantId: string;
}) {
  await getPlatformDatabase()
    .insertInto("platform_activity")
    .values({
      action: input.action,
      actor_email: input.actorEmail,
      details_json: JSON.stringify({ tenantId: input.tenantId }),
      module_key: input.moduleKey,
      record_id: input.recordId,
      record_label: input.recordLabel,
      record_uuid: input.recordUuid,
      uuid: randomBytes(4).toString("hex")
    })
    .execute();
}
