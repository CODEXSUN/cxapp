import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok } from "@cxapp/framework/http";
import { AppError } from "@cxapp/framework/errors";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import {
  backupConfiguration,
  backupList,
  backupExport,
  backupDownload,
  backupUpload,
  backupRestore
} from "./backup-center.service.js";
const base = z.object({ locationId: z.string().min(1) });
const selection = base.extend({
  scope: z.enum(["master", "tenant"]),
  tenantCode: z.string().default("")
});
export async function registerBackupCenterRoutes(app: FastifyInstance) {
  const guard = { preHandler: requireSuperAdmin };
  const run = async <T>(requestId: string, fn: () => Promise<T>) => {
    try {
      return ok(await fn(), { requestId });
    } catch (e) {
      throw AppError.validation(e instanceof Error ? e.message : "Backup operation failed.");
    }
  };
  app.get("/admin/backups/config", guard, (request) => run(request.id, backupConfiguration));
  app.get("/admin/backups", guard, (request) =>
    run(request.id, () => {
      const p = selection.parse(request.query);
      return backupList(p.locationId, p.scope, p.tenantCode);
    })
  );
  app.post("/admin/backups/export", guard, (request) =>
    run(request.id, () =>
      backupExport(
        base
          .extend({
            profileId: z.string(),
            scope: z.enum(["master", "tenant"]),
            tenantId: z.number().int().positive().optional(),
            downloadOnly: z.boolean().optional()
          })
          .parse(request.body)
      )
    )
  );
  app.get("/admin/backups/:id", guard, (request) =>
    run(request.id, () =>
      backupDownload(
        base.parse(request.query).locationId,
        z.object({ id: z.string().uuid() }).parse(request.params).id
      )
    )
  );
  app.post("/admin/backups/upload", { ...guard, bodyLimit: 40 * 1024 * 1024 }, (request) =>
    run(request.id, () => {
      const p = base
        .extend({
          artifact: z.unknown(),
          scope: z.enum(["master", "tenant"]).optional(),
          tenantCode: z.string().optional()
        })
        .parse(request.body);
      return backupUpload(p.locationId, p.artifact, p);
    })
  );
  app.post("/admin/backups/restore", guard, (request) =>
    run(request.id, () =>
      backupRestore(
        selection
          .extend({
            id: z.string().uuid(),
            profileId: z.string(),
            databaseName: z.string(),
            confirmation: z.string(),
            mode: z.enum(["new", "fresh", "incremental"]).optional()
          })
          .parse(request.body)
      )
    )
  );
}
