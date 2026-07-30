import type { Kysely } from "kysely";
import { env } from "../../env.js";
import { hashPassword } from "../../auth/password-hash.js";
import type { PlatformDatabase } from "../../database/schema.js";
import { stableCredentialUuid } from "./credential-recovery.repository.js";

export async function seedCredentialRecoveryModule(database: Kysely<PlatformDatabase>) {
  const credentials = [
    {
      email: env.SUPER_ADMIN_EMAIL.trim().toLowerCase(),
      name: env.SUPER_ADMIN_NAME.trim() || "Super Admin",
      password: env.SUPER_ADMIN_PASSWORD,
      userType: "super_admin" as const
    },
    {
      email: env.SOFTWARE_ADMIN_EMAIL.trim().toLowerCase(),
      name: env.SOFTWARE_ADMIN_NAME.trim() || "Software Admin",
      password: env.SOFTWARE_ADMIN_PASSWORD,
      userType: "staff" as const
    }
  ].filter((item) => item.email && item.password);
  for (const credential of credentials) {
    await database
      .insertInto("platform_auth_users")
      .values({
        email: credential.email,
        name: credential.name,
        password_hash: hashPassword(credential.password),
        status: "active",
        user_type: credential.userType,
        uuid: stableCredentialUuid(credential.userType, credential.email)
      })
      .ignore()
      .execute();
  }
  return { seeded: credentials.length };
}
