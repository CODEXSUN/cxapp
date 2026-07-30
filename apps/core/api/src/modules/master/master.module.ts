import type { FastifyInstance } from "fastify";
import { contactModule } from "./contact/index.js";
import { productModule } from "./product/index.js";
import { workOrderModule } from "./work-order/index.js";
export const masterModule = {
  key: "core.master",
  async register(app: FastifyInstance) {
    await contactModule.register(app);
    await productModule.register(app);
    await workOrderModule.register(app);
  }
};
