import type { FastifyReply, FastifyRequest } from "fastify";
import { fail } from "@codexsun/framework/http";
import { verifyAuthToken } from "./jwt.js";

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(request);
  const payload = token ? verifyAuthToken(token) : null;
  if (payload?.userType === "super_admin") {
    return;
  }

  return reply.code(403).send(
    fail(
      {
        code: "SUPER_ADMIN_REQUIRED",
        message: "Super Admin permission is required for this operation."
      },
      { requestId: request.id }
    )
  );
}

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
}
