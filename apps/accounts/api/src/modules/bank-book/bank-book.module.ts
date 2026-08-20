import type { FastifyInstance } from "fastify";
import { registerBankBookRoutes } from "./bank-book.routes.js";

export const bankBookModule = {
  key: "accounts.bank-book",
  label: "Bank Book",
  register(app: FastifyInstance) {
    return registerBankBookRoutes(app);
  }
};