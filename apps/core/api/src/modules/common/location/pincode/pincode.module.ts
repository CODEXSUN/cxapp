import type { FastifyInstance } from "fastify";
import { registerPincodeRoutes } from "./pincode.routes.js";

export const pincodeModule = {
  key: "core.common.location.pincode",
  label: "Pincode",
  register(app: FastifyInstance) {
    return registerPincodeRoutes(app);
  }
};
