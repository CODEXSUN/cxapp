import type { FastifyInstance } from "fastify";
import { registerOverviewRoutes } from "./overview.routes.js";

export const overviewModule = {
  key: "accounts.overview",
  label: "Accounts Overview",
  register(app: FastifyInstance) {
    return registerOverviewRoutes(app);
  }
};