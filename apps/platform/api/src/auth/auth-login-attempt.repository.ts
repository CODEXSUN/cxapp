import { createHash, randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../database/platform-database.js";

const windowMs = 15 * 60 * 1000;
const maximumFailures = 5;

export class AuthLoginAttemptRepository {
  async isRateLimited(key: string) {
    const hash = keyHash(key);
    const row = await getPlatformDatabase()
      .selectFrom("auth_login_attempts")
      .select(["blocked_until", "failure_count"])
      .where("attempt_key_hash", "=", hash)
      .executeTakeFirst();
    if (!row) return false;
    if (new Date(row.blocked_until).getTime() <= Date.now()) {
      await this.clear(key);
      return false;
    }
    return Number(row.failure_count) >= maximumFailures;
  }

  async recordFailure(key: string) {
    const hash = keyHash(key);
    const current = await getPlatformDatabase()
      .selectFrom("auth_login_attempts")
      .select(["blocked_until", "failure_count"])
      .where("attempt_key_hash", "=", hash)
      .executeTakeFirst();
    const active = current && new Date(current.blocked_until).getTime() > Date.now();
    const now = new Date();
    await getPlatformDatabase()
      .insertInto("auth_login_attempts")
      .values({
        attempt_key_hash: hash,
        blocked_until: active ? current.blocked_until : new Date(Date.now() + windowMs),
        failure_count: active ? Number(current.failure_count) + 1 : 1,
        last_failed_at: now,
        status: "active",
        updated_at: now,
        uuid: randomBytes(4).toString("hex")
      })
      .onDuplicateKeyUpdate({
        blocked_until: active ? current.blocked_until : new Date(Date.now() + windowMs),
        failure_count: active ? Number(current.failure_count) + 1 : 1,
        last_failed_at: now,
        status: "active",
        updated_at: now
      })
      .execute();
  }

  async clear(key: string) {
    await getPlatformDatabase()
      .deleteFrom("auth_login_attempts")
      .where("attempt_key_hash", "=", keyHash(key))
      .execute();
  }
}

function keyHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
