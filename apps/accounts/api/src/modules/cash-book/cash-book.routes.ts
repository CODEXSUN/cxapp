import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveAccountsDatabaseName } from "../../database/accounts-database.js";
import { CashBookService } from "./cash-book.service.js";

const service = new CashBookService();

const cashBookAccountSchema = z.object({
  accountId: z.number().int().positive(),
  accountType: z.string(),
  balance: z.number(),
  code: z.string(),
  id: z.string(),
  name: z.string(),
  openingBalance: z.number()
});

const cashBookRegisterLineSchema = z.object({
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

const cashBookRegisterSchema = z.object({
  accounts: z.array(cashBookAccountSchema),
  closingBalance: z.number(),
  lines: z.array(cashBookRegisterLineSchema),
  openingBalance: z.number()
});

const cashBookEntrySchema = z.object({
  accountId: z.string().regex(/^[0-9a-f]{8}$/, "Account must be 8 hex characters."),
  amount: z.coerce.number().finite().positive(),
  companyId: z.number().int().positive(),
  counterpartAccountId: z.string().regex(/^[0-9a-f]{8}$/, "Account must be 8 hex characters."),
  description: z.string().trim().min(1).max(500),
  entryDate: z.iso.date(),
  entryNumber: z.string().optional(),
  financialYearId: z.number().int().positive(),
  reference: z.string().optional(),
  type: z.enum(["receipt", "payment"])
});

const cashBookJournalSchema = z.object({
  id: z.string(),
  entryNumber: z.string(),
  status: z.string()
});

export async function registerCashBookRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book",
    schemas: { response: cashBookRegisterSchema },
    handler: async ({ request }) =>
      required(await service.register(databaseName(request)))
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/cash-book/entries",
    schemas: { body: cashBookEntrySchema, response: cashBookJournalSchema },
    handler: ({ body, request }) => service.postEntry(databaseName(request), body)
  });
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveAccountsDatabaseName(Array.isArray(value) ? value[0] : value);
}

function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("No cash accounts are configured yet.");
  return value;
}