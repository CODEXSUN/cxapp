import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveAccountsDatabaseName } from "../../database/accounts-database.js";
import { CashBookService } from "./cash-book.service.js";
import { CashBookLookupService } from "./cash-book.lookup.js";

const service = new CashBookService();
const lookups = new CashBookLookupService();

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
  postedEntryId: z.string(),
  sourceId: z.string(),
  sourceType: z.enum(["journal", "cash-book", "bank-book"])
});

const cashBookRegisterSchema = z.object({
  accounts: z.array(cashBookAccountSchema),
  closingBalance: z.number(),
  lines: z.array(cashBookRegisterLineSchema),
  openingBalance: z.number()
});

const cashBookEntrySchema = z.object({
  cashLedgerId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  description: z.string().trim().min(1).max(500),
  entryDate: z.iso.date(),
  entryNumber: z.string().optional(),
  financialYearId: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        amount: z.union([z.literal(""), z.coerce.number().finite().nonnegative()]),
        ledgerId: z.number().int().positive()
      })
    )
    .min(1),
  reference: z.string().optional(),
  type: z.enum(["receipt", "payment"])
});

const cashBookLedgerSchema = z.object({
  groupName: z.string(),
  id: z.number().int().positive(),
  name: z.string()
});

const cashBookContextSchema = z.object({
  rowPosition: z.number().int().positive(),
  suggestedEntryNumber: z.string().min(1)
});

const cashBookLedgerGroupSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  status: z.enum(["active", "inactive"])
});

const cashBookLedgerCreateSchema = z.object({
  ledgerGroupId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  status: z.enum(["active", "inactive"]).default("active")
});

const cashBookEntryResponseSchema = z.object({
  account: cashBookAccountSchema,
  amount: z.number(),
  cashLedger: cashBookLedgerSchema.nullable(),
  counterpart: z.object({
    accountId: z.number().int().positive(),
    code: z.string(),
    id: z.string(),
    name: z.string()
  }),
  counterpartLedger: cashBookLedgerSchema.nullable(),
  description: z.string(),
  entryDate: z.string(),
  id: z.string(),
  lines: z.array(
    z.object({
      account: z.object({
        accountId: z.number().int().positive(),
        code: z.string(),
        id: z.string(),
        name: z.string()
      }),
      amount: z.number(),
      ledger: cashBookLedgerSchema.nullable(),
      lineNumber: z.number().int().positive()
    })
  ),
  entryNumber: z.string(),
  postedEntryId: z.string(),
  reference: z.string(),
  status: z.enum(["posted", "reversed"]),
  type: z.enum(["receipt", "payment"])
});

export async function registerCashBookRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book/context",
    schemas: { response: cashBookContextSchema },
    handler: ({ request }) => service.context(databaseName(request))
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book/ledgers",
    schemas: { response: z.array(cashBookLedgerSchema) },
    handler: ({ request }) => service.ledgers(databaseName(request))
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/cash-book/ledgers",
    schemas: { body: cashBookLedgerCreateSchema, response: cashBookLedgerSchema },
    handler: ({ body, request }) => lookups.createLedger(lookupHeaders(request), body)
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book/ledger-groups",
    schemas: { response: z.array(cashBookLedgerGroupSchema) },
    handler: ({ request }) => lookups.ledgerGroups(lookupHeaders(request))
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book",
    schemas: { response: cashBookRegisterSchema },
    handler: async ({ request }) => required(await service.register(databaseName(request)))
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/cash-book/entries/:id",
    schemas: {
      params: z.object({ id: z.string().regex(/^[0-9a-f]{8}$/) }),
      response: cashBookEntryResponseSchema
    },
    handler: async ({ params, request }) =>
      requiredEntry(await service.getEntry(databaseName(request), params.id))
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/cash-book/entries",
    schemas: { body: cashBookEntrySchema, response: cashBookEntryResponseSchema },
    handler: ({ body, request }) => service.postEntry(databaseName(request), body)
  });
}

function requiredEntry<T>(value: T | null): T {
  if (!value) throw AppError.notFound("Cash entry was not found.");
  return value;
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveAccountsDatabaseName(Array.isArray(value) ? value[0] : value);
}

function lookupHeaders(request: FastifyRequest) {
  return {
    authorization: request.headers.authorization,
    tenantDatabase: request.headers["x-tenant-db"],
    tenantId: request.headers["x-tenant-id"]
  };
}

function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("No cash accounts are configured yet.");
  return value;
}
