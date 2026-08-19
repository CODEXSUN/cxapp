import type { FastifyInstance } from "fastify";
import { registerBookRoutes } from "../book/book.routes.js";

export const bankBookModule = {
  key: "accounts.bank-book",
  label: "Bank Book",
  register(app: FastifyInstance) {
    return registerBookRoutes(app, "bank");
  }
};