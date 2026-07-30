import type { FastifyInstance } from "fastify";
import { registerDistrictRoutes } from "./district.routes.js";

export const districtModule = {
  key: "core.common.location.district",
  label: "District",
  register(app: FastifyInstance) {
    return registerDistrictRoutes(app);
  }
};
