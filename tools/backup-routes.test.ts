import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerBackupCenterRoutes } from "../apps/platform/api/src/modules/database-maintenance/backup-center.routes.js";
test("every backup endpoint rejects unauthenticated callers before file or database access", async () => {
  const app = Fastify();
  await registerBackupCenterRoutes(app);
  try {
    for (const [method, url] of [
      ["GET", "/admin/backups/config"],
      ["GET", "/admin/backups"],
      ["GET", "/admin/backups/not-a-file"],
      ["POST", "/admin/backups/export"],
      ["POST", "/admin/backups/upload"],
      ["POST", "/admin/backups/restore"]
    ] as const) {
      const response = await app.inject({
        method,
        url,
        ...(method === "POST" ? { payload: {} } : {})
      });
      assert.equal(response.statusCode, 403, url);
      assert.equal(response.json().error.code, "SUPER_ADMIN_REQUIRED");
    }
  } finally {
    await app.close();
  }
});
