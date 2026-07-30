import type { FastifyInstance } from "fastify";
import { defineModule } from "@codexsun/framework/modules";
import { registerMailRoutes } from "./mail.routes.js";
import type { MailModuleDependencies } from "./mail.types.js";

export function createMailModule(dependencies: MailModuleDependencies) {
  return defineModule<{ app: FastifyInstance }>({
    key: "mail",
    label: "Mail",
    register: ({ app }) => registerMailRoutes(app, dependencies)
  });
}
