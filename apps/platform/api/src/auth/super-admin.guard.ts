import type { FastifyReply, FastifyRequest } from "fastify";
import { fail } from "@codexsun/framework/http";

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = request.authContext?.payload;
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
