import type { FastifyRequest } from "fastify";
import { sql } from "kysely";
import { AppError } from "@codexsun/framework/errors";
import { getBillingDatabase } from "../database/billing-database.js";

export async function authorizeBillingRequest(
  request: FastifyRequest,
  databaseName: string,
  actorEmail: string
) {
  const permission = billingPermission(request);
  const result = await sql<{ id: number }>`
    SELECT permission.id
    FROM users actor
    INNER JOIN user_roles user_role ON user_role.user_id=actor.id AND user_role.status='active'
    INNER JOIN roles role ON role.id=user_role.role_id AND role.status='active'
    INNER JOIN role_permissions role_permission ON role_permission.role_id=role.id AND role_permission.status='active'
    INNER JOIN permissions permission ON permission.id=role_permission.permission_id AND permission.status='active'
    WHERE actor.email=${actorEmail} AND actor.status='active' AND permission.key=${permission}
    LIMIT 1
  `.execute(await getBillingDatabase(databaseName));
  if (!result.rows[0]) throw AppError.forbidden(`Permission ${permission} is required.`);
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
