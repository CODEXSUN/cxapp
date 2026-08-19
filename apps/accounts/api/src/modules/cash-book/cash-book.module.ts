import type { FastifyInstance } from "fastify";
import { registerBookRoutes } from "../book/book.routes.js";

export const cashBookModule = {
  key: "accounts.cash-book",
  label: "Cash Book",
  register(app: FastifyInstance) {
    return registerBookRoutes(app, "cash");
  }
};