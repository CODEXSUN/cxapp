import type { FastifyInstance } from "fastify";
import { registerContactRoutes } from "./contact.routes.js";
export const contactModule = {
  key: "core.master.contact",
  register(app: FastifyInstance) {
    return registerContactRoutes(app);
  }
};
