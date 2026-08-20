import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveAccountsDatabaseName } from "../../database/accounts-database.js";
import { BankBookService } from "./bank-book.service.js";

const service = new BankBookService();

const bankBookAccountSchema = z.object({
  accountId: z.number().int().positive(),
  accountType: z.string(),
  balance: z.number(),
  code: z.string(),
  id: z.string(),
  name: z.string(),
  openingBalance: z.number()
});

const bankBookRegisterLineSchema = z.object({
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
  postedEntryId: z.string(),
  sourceId: z.string(),
  sourceType: z.enum(["journal", "cash-book", "bank-book"])
});

const bankBookRegisterSchema = z.object({
  accounts: z.array(bankBookAccountSchema),
  closingBalance: z.number(),
  lines: z.array(bankBookRegisterLineSchema),
  openingBalance: z.number()
});

const bankBookEntrySchema = z.object({
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

const bankBookEntryResponseSchema = z.object({
  account: bankBookAccountSchema,
  amount: z.number(),
  counterpart: z.object({
    accountId: z.number().int().positive(),
    code: z.string(),
    id: z.string(),
    name: z.string()
  }),
  description: z.string(),
  entryDate: z.string(),
  id: z.string(),
  entryNumber: z.string(),
  postedEntryId: z.string(),
  reference: z.string(),
  status: z.enum(["posted", "reversed"]),
  type: z.enum(["receipt", "payment"])
});

export async function registerBankBookRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/bank-book",
    schemas: { response: bankBookRegisterSchema },
    handler: async ({ request }) => required(await service.register(databaseName(request)))
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/bank-book/entries/:id",
    schemas: {
      params: z.object({ id: z.string().regex(/^[0-9a-f]{8}$/) }),
      response: bankBookEntryResponseSchema
    },
    handler: async ({ params, request }) =>
      requiredEntry(await service.getEntry(databaseName(request), params.id))
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/bank-book/entries",
    schemas: { body: bankBookEntrySchema, response: bankBookEntryResponseSchema },
    handler: ({ body, request }) => service.postEntry(databaseName(request), body)
  });
}

function requiredEntry<T>(value: T | null): T {
  if (!value) throw AppError.notFound("Bank entry was not found.");
  return value;
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveAccountsDatabaseName(Array.isArray(value) ? value[0] : value);
}

function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("No bank accounts are configured yet.");
  return value;
}
