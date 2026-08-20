import type { FastifyInstance } from "fastify";
import { registerCashBookRoutes } from "./cash-book.routes.js";

export const cashBookModule = {
  key: "accounts.cash-book",
  label: "Cash Book",
  register(app: FastifyInstance) {
    return registerCashBookRoutes(app);
  }
};