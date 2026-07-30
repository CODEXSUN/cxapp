import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { PlatformActivity, PlatformActivityInput } from "./platform-activity.types.js";

export class PlatformActivityRepository {
  async list(limit = 100) {
    const rows = await getPlatformDatabase()
      .selectFrom("platform_activity")
      .selectAll()
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .limit(limit)
      .execute();
    return rows.map((row): PlatformActivity => ({
      action: row.action,
      actorEmail: row.actor_email,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
      details: parseDetails(row.details_json),
      id: Number(row.id),
      moduleKey: row.module_key,
      recordId: row.record_id === null ? null : Number(row.record_id),
      recordLabel: row.record_label,
      recordUuid: row.record_uuid,
      uuid: row.uuid
    }));
  }

  async record(input: PlatformActivityInput) {
    await getPlatformDatabase()
      .insertInto("platform_activity")
      .values({
        action: input.action,
        actor_email: input.actorEmail ?? "system@codexsun.app",
        details_json: JSON.stringify(input.details ?? {}),
        module_key: input.moduleKey,
        record_id: input.recordId ?? null,
        record_label: input.recordLabel,
        record_uuid: input.recordUuid ?? null,
        uuid: randomBytes(4).toString("hex")
      })
      .execute();
  }
}

function parseDetails(value: string) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
