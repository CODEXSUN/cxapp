import type { FastifyRequest } from "fastify";
import { AppError } from "@cxapp/framework/errors";
import { sql } from "kysely";
import { getAccountsDatabase } from "../database/accounts-database.js";

export async function authorizeAccountsRequest(
  request: FastifyRequest,
  databaseName: string,
  actorEmail: string
) {
  if (!databaseName || !actorEmail)
    throw AppError.forbidden("Accounts access requires a signed-in actor.");
  const permission = accountsPermission(request);
  const result = await sql<{ id: number }>`
    SELECT permission.id FROM app_users actor
    INNER JOIN app_user_roles user_role ON user_role.user_id=actor.id AND user_role.status='active'
    INNER JOIN app_roles role ON role.id=user_role.role_id AND role.status='active'
    INNER JOIN app_role_permissions role_permission ON role_permission.role_id=role.id AND role_permission.status='active'
    INNER JOIN app_permissions permission ON permission.id=role_permission.permission_id AND permission.status='active'
    WHERE actor.email=${actorEmail} AND actor.status='active' AND permission.key=${permission} LIMIT 1
  `.execute(await getAccountsDatabase(databaseName));
  if (!result.rows[0]) throw AppError.forbidden(`Permission ${permission} is required.`);
}

function accountsPermission(request: FastifyRequest) {
  const method = request.method.toUpperCase();
  const route = request.routeOptions.url ?? request.url;
  if (method === "GET" || method === "HEAD") return "accounts.accounting.view";
  if (/\/(submit|post|reverse|cancel)$/.test(route)) return "accounts.accounting.post";
  if (method === "POST" && /^\/(cash|bank)-book\/entries$/.test(route))
    return "accounts.accounting.post";
  if (method === "POST") return "accounts.accounting.create";
  if (method === "PUT" || method === "PATCH") return "accounts.accounting.update";
  return "accounts.accounting.delete";
}
