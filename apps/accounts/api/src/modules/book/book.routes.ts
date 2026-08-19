import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveAccountsDatabaseName } from "../../database/accounts-database.js";
import { BookService } from "./book.service.js";
import type { BookEntryType } from "./book.types.js";

const service = new BookService();

const bookAccountSchema = z.object({
  accountId: z.number().int().positive(),
  accountType: z.string(),
  balance: z.number(),
  code: z.string(),
  id: z.string(),
  name: z.string(),
  openingBalance: z.number()
});

const bookRegisterLineSchema = z.object({
  accountCode: z.string(),
  accountId: z.number(),
  accountName: z.string(),
  balance: z.number(),
  credit: z.number(),
  debit: z.number(),
  description: z.string(),
  entryDate: z.string(),
  entryNumber: z.string(),
  id: z.string(),
  journalId: z.string()
});

const bookRegisterSchema = z.object({
  accounts: z.array(bookAccountSchema),
  closingBalance: z.number(),
  lines: z.array(bookRegisterLineSchema),
  openingBalance: z.number()
});

const entryTypeSchema = z.enum(["receipt", "payment"]);
const bookEntrySchema = z.object({
  accountId: z.string().regex(/^[0-9a-f]{8}$/, "Account must be 8 hex characters."),
  amount: z.coerce.number().finite().positive(),
  companyId: z.number().int().positive(),
  counterpartAccountId: z.string().regex(/^[0-9a-f]{8}$/, "Account must be 8 hex characters."),
  description: z.string().trim().min(1).max(500),
  entryDate: z.iso.date(),
  entryNumber: z.string().optional(),
  financialYearId: z.number().int().positive(),
  reference: z.string().optional(),
  type: entryTypeSchema
});

const bookJournalSchema = z.object({
  id: z.string(),
  entryNumber: z.string(),
  status: z.string()
});

export function registerBookRoutes(app: FastifyInstance, kind: "cash" | "bank") {
  registerContractRoute(app, {
    method: "GET",
    url: `/${kind}-book`,
    schemas: { response: bookRegisterSchema },
    handler: async ({ request }) =>
      required(await service.register(databaseName(request), kind))
  });

  registerContractRoute(app, {
    method: "POST",
    url: `/${kind}-book/entries`,
    schemas: { body: bookEntrySchema, response: bookJournalSchema },
    handler: ({ body, request }) => service.postEntry(databaseName(request), kind, body)
  });
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveAccountsDatabaseName(Array.isArray(value) ? value[0] : value);
}

function required<T>(value: T | null): T {
  if (!value)
    throw Object.assign(new Error("The book has no cash or bank accounts configured yet."), {
      statusCode: 404
    });
  return value;
}