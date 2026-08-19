import type { FastifyRequest } from "fastify";
import { AppError } from "@cxapp/framework/errors";

export async function authorizeAccountsRequest(
  request: FastifyRequest,
  databaseName: string,
  actorEmail: string
) {
  if (!databaseName) throw AppError.validation("A tenant database is required for Accounts access.");
  if (!actorEmail) throw AppError.forbidden("Accounts access requires a signed-in actor.");
  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    throw AppError.validation("Unsupported Accounts request method.");
  }
}