import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxapp/framework/http";
import { CredentialRecoveryService } from "./credential-recovery.service.js";

const desk = z.enum(["admin", "sa", "tenant"]);
const requestPayload = z
  .object({
    corporateId: z.string().trim().max(120).optional(),
    desk,
    email: z.string().email().max(190)
  })
  .strict();
const requestResponse = z.object({ accepted: z.literal(true), message: z.string() });
const resetPayload = z
  .object({
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/, "Password requires a lowercase letter.")
      .regex(/[A-Z]/, "Password requires an uppercase letter.")
      .regex(/[0-9]/, "Password requires a number."),
    token: z.string().min(32).max(128)
  })
  .strict();

export async function registerCredentialRecoveryRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "POST",
    url: "/auth/password/forgot",
    schemas: { body: requestPayload, response: requestResponse },
    handler: ({ body, request }) =>
      new CredentialRecoveryService().request({
        desk: body.desk,
        domain: requestDomain(request.headers),
        email: body.email,
        ...(body.corporateId !== undefined ? { corporateId: body.corporateId } : {})
      })
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/auth/password/reset",
    schemas: { body: resetPayload, response: z.object({ reset: z.literal(true) }) },
    handler: ({ body }) => new CredentialRecoveryService().reset(body)
  });
}

function requestDomain(headers: Record<string, unknown>) {
  const forwardedHost = headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || headers.host || "";
  return String(host);
}
