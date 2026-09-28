import type { FastifyRequest } from "fastify";
import { sql } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getBillingDatabase } from "../database/billing-database.js";

export async function authorizeBillingRequest(
  request: FastifyRequest,
  databaseName: string,
  actorEmail: string
) {
  const permission = billingPermission(request);
  const database = await getBillingDatabase(databaseName);
  const result = await sql<{ id: number }>`
    SELECT permission.id
    FROM app_users actor
    INNER JOIN app_user_roles user_role ON user_role.user_id=actor.id AND user_role.status='active'
    INNER JOIN app_roles role ON role.id=user_role.role_id AND role.status='active'
    INNER JOIN app_role_permissions role_permission ON role_permission.role_id=role.id AND role_permission.status='active'
    INNER JOIN app_permissions permission ON permission.id=role_permission.permission_id AND permission.status='active'
    WHERE actor.email=${actorEmail} AND actor.status='active' AND permission.key=${permission}
  `.execute(database);
  if (!result.rows.length) throw AppError.forbidden(`Permission ${permission} is required.`);
  const roleResult = await sql<{ role_key: string }>`
    SELECT role.\`key\` AS role_key
    FROM app_users actor
    INNER JOIN app_user_roles user_role ON user_role.user_id=actor.id AND user_role.status='active'
    INNER JOIN app_roles role ON role.id=user_role.role_id AND role.status='active'
    WHERE actor.email=${actorEmail} AND actor.status='active'
  `.execute(database);
  const canEditEntries = roleResult.rows.some((row) =>
    ["admin", "super-admin", "super_admin"].includes(row.role_key)
  );
  if ((request.method === "PUT" || request.method === "PATCH") && !canEditEntries) {
    throw AppError.forbidden("Only a tenant Admin or Super Admin can edit Billing entries.");
  }
  return {
    canEditEntries,
    canEditFinalizedEntries: canEditEntries
  };
}

function billingPermission(request: FastifyRequest) {
  const method = request.method.toUpperCase();
  const route = request.routeOptions.url ?? request.url;
  if (method === "GET" || method === "HEAD") return "billing.application.records.view";
  if (route.includes("/einvoice/") || route.includes("/eway/")) {
    return "billing.application.records.compliance";
  }
  if (/\/(confirm|cancel|revoke|post|convert-to-sale)$/.test(route)) {
    return "billing.application.records.lifecycle";
  }
  if (method === "POST") return "billing.application.records.create";
  if (method === "PUT" || method === "PATCH") return "billing.application.records.update";
  return "billing.application.records.delete";
}
