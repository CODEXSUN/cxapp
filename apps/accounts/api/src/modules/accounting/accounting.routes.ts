import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveAccountsDatabaseName } from "../../database/accounts-database.js";
import { AccountingService } from "./accounting.service.js";

const service = new AccountingService();

const idSchema = z.object({ id: z.string().regex(/^[0-9a-f]{8}$/, "ID must be 8 hex characters.") });
const accountTypeSchema = z.enum(["asset", "liability", "equity", "income", "expense"]);
const normalBalanceSchema = z.enum(["debit", "credit"]);
const recordStatusSchema = z.enum(["active", "inactive"]);
const journalStatusSchema = z.enum([
  "draft",
  "ready_to_post",
  "posted",
  "cancelled",
  "reversed"
]);
const periodStatusSchema = z.enum(["open", "closed", "locked"]);

const contextSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  currencyCode: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string()
});

const groupSchema = z.object({
  code: z.string(),
  companyId: z.number().int().positive(),
  createdAt: z.string(),
  deleted: z.boolean(),
  financialYearId: z.number().int().positive(),
  id: z.string(),
  isSystem: z.boolean(),
  name: z.string(),
  normalBalance: normalBalanceSchema,
  parentId: z.number().int().positive().nullable(),
  status: recordStatusSchema,
  updatedAt: z.string()
});
const groupSaveSchema = z.object({
  code: z.string().trim().min(1),
  companyId: z.number().int().positive(),
  financialYearId: z.number().int().positive(),
  name: z.string().trim().min(1),
  normalBalance: normalBalanceSchema,
  parentId: z.number().int().positive().nullable(),
  status: recordStatusSchema
});

const accountSchema = z.object({
  accountId: z.number().int().positive(),
  accountType: accountTypeSchema,
  code: z.string(),
  companyId: z.number().int().positive(),
  createdAt: z.string(),
  currencyCode: z.string(),
  deleted: z.boolean(),
  description: z.string(),
  financialYearId: z.number().int().positive(),
  groupId: z.number().int().positive().nullable(),
  groupName: z.string(),
  id: z.string(),
  isBank: z.boolean(),
  isCash: z.boolean(),
  isGroup: z.boolean(),
  isPostable: z.boolean(),
  isSystem: z.boolean(),
  name: z.string(),
  normalBalance: normalBalanceSchema,
  openingBalance: z.number(),
  status: recordStatusSchema,
  updatedAt: z.string()
});
const accountSaveSchema = z.object({
  accountType: accountTypeSchema,
  code: z.string().trim().min(1),
  companyId: z.number().int().positive(),
  currencyCode: z.string().optional(),
  description: z.string().optional(),
  financialYearId: z.number().int().positive(),
  groupId: z.number().int().positive().nullable(),
  isBank: z.boolean().optional(),
  isCash: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  isPostable: z.boolean().optional(),
  name: z.string().trim().min(1),
  normalBalance: normalBalanceSchema,
  openingBalance: z.coerce.number().finite().optional(),
  status: recordStatusSchema
});

const journalLineInputSchema = z.object({
  accountId: z.number().int().positive(),
  credit: z.coerce.number().finite().nonnegative(),
  debit: z.coerce.number().finite().nonnegative(),
  description: z.string().optional()
});
const journalLineSchema = journalLineInputSchema.extend({
  accountCode: z.string(),
  accountName: z.string(),
  id: z.string(),
  lineNumber: z.number().int().positive()
});
const journalSchema = z.object({
  accountingPeriodId: z.number().int().positive().nullable(),
  accountingPeriodName: z.string(),
  companyId: z.number().int().positive(),
  createdAt: z.string(),
  deleted: z.boolean(),
  description: z.string(),
  entryDate: z.string(),
  entryNumber: z.string(),
  financialYearId: z.number().int().positive(),
  id: z.string(),
  lineNumber: z.number().int().positive(),
  lines: z.array(journalLineSchema),
  reference: z.string(),
  status: journalStatusSchema,
  totalCredit: z.number(),
  totalDebit: z.number(),
  updatedAt: z.string()
});
const journalSaveSchema = z.object({
  accountingPeriodId: z.number().int().positive().nullable(),
  companyId: z.number().int().positive(),
  description: z.string().optional(),
  entryDate: z.iso.date(),
  entryNumber: z.string().optional(),
  financialYearId: z.number().int().positive(),
  lines: z.array(journalLineInputSchema),
  reference: z.string().optional(),
  status: z.enum(["draft", "ready_to_post"])
});
const journalPageSchema = z.object({
  items: z.array(journalSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});
const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(100),
  search: z.string().default(""),
  status: z.enum(["all", "draft", "ready_to_post", "posted", "cancelled", "reversed"]).default("all")
});

const ledgerSchema = z.object({
  account: z.object({
    accountType: accountTypeSchema,
    balance: z.number(),
    code: z.string(),
    id: z.string(),
    name: z.string(),
    normalBalance: normalBalanceSchema,
    openingBalance: z.number()
  }),
  closingBalance: z.number(),
  lines: z.array(
    z.object({
      accountCode: z.string(),
      accountId: z.number(),
      accountName: z.string(),
      balance: z.number(),
      credit: z.number(),
      debit: z.number(),
      entryDate: z.string(),
      entryNumber: z.string(),
      id: z.string(),
      journalId: z.string()
    })
  )
});

const periodSchema = z.object({
  companyId: z.number().int().positive(),
  createdAt: z.string(),
  endDate: z.string(),
  financialYearId: z.number().int().positive(),
  id: z.string(),
  isSystem: z.boolean(),
  name: z.string(),
  periodId: z.number().int().positive(),
  startDate: z.string(),
  status: periodStatusSchema,
  updatedAt: z.string()
});
const periodSaveSchema = z.object({
  companyId: z.number().int().positive(),
  endDate: z.iso.date(),
  financialYearId: z.number().int().positive(),
  name: z.string().trim().min(1),
  startDate: z.iso.date(),
  status: periodStatusSchema
});
const periodStatusBodySchema = z.object({ status: periodStatusSchema });
const cancelBodySchema = z.object({ reason: z.string().trim().min(1).max(500) });
const statusBodySchema = z.object({ status: recordStatusSchema });

export async function registerAccountingRoutes(app: FastifyInstance) {
  const get = <T>(url: string, schema: z.ZodType<T>, load: (db: string) => Promise<T>) =>
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { response: schema },
      handler: ({ request }) => load(databaseName(request))
    });
  const getById = <T>(url: string, schema: z.ZodType<T>, load: (db: string, id: string) => Promise<T | null>) =>
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { params: idSchema, response: schema },
      handler: async ({ params, request }) => required(await load(databaseName(request), params.id))
    });

  registerContractRoute(app, {
    method: "GET",
    url: "/accounts/context",
    schemas: { response: contextSchema },
    handler: ({ request }) => service.getContext(databaseName(request))
  });

  // Account groups
  get("/accounts/groups", z.array(groupSchema), (db) => service.listGroups(db));
  getById("/accounts/groups/:id", groupSchema, (db, id) => service.getGroup(db, id));
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/groups",
    schemas: { body: groupSaveSchema, response: groupSchema },
    handler: ({ body, request }) => service.createGroup(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/accounts/groups/:id",
    schemas: { body: groupSaveSchema, params: idSchema, response: groupSchema },
    handler: async ({ body, params, request }) =>
      required(await service.updateGroup(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/accounts/groups/:id",
    schemas: { params: idSchema, response: groupSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteGroup(databaseName(request), params.id))
  });

  // Accounts
  get("/accounts", z.array(accountSchema), (db) => service.listAccounts(db));
  getById("/accounts/:id", accountSchema, (db, id) => service.getAccount(db, id));
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts",
    schemas: { body: accountSaveSchema, response: accountSchema },
    handler: ({ body, request }) => service.createAccount(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/accounts/:id",
    schemas: { body: accountSaveSchema, params: idSchema, response: accountSchema },
    handler: async ({ body, params, request }) =>
      required(await service.updateAccount(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "PATCH",
    url: "/accounts/:id/status",
    schemas: { body: statusBodySchema, params: idSchema, response: accountSchema },
    handler: async ({ body, params, request }) =>
      required(await service.setAccountStatus(databaseName(request), params.id, body.status))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/accounts/:id",
    schemas: { params: idSchema, response: accountSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteAccount(databaseName(request), params.id))
  });

  // Journals
  get("/accounts/journals", z.array(journalSchema), (db) => service.listJournals(db));
  registerContractRoute(app, {
    method: "GET",
    url: "/accounts/journals/page",
    schemas: { querystring: pageQuerySchema, response: journalPageSchema },
    handler: ({ query, request }) => service.listJournalsPage(databaseName(request), query)
  });
  getById("/accounts/journals/:id", journalSchema, (db, id) => service.getJournal(db, id));
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/journals",
    schemas: { body: journalSaveSchema, response: journalSchema },
    handler: ({ body, request }) => service.createJournal(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/accounts/journals/:id",
    schemas: { body: journalSaveSchema, params: idSchema, response: journalSchema },
    handler: async ({ body, params, request }) =>
      required(await service.updateJournal(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/journals/:id/submit",
    schemas: { params: idSchema, response: journalSchema },
    handler: async ({ params, request }) =>
      required(await service.submitJournal(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/journals/:id/post",
    schemas: { params: idSchema, response: journalSchema },
    handler: async ({ params, request }) =>
      required(await service.postJournal(databaseName(request), params.id, actorEmail(request)))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/journals/:id/reverse",
    schemas: { params: idSchema, response: journalSchema },
    handler: async ({ params, request }) =>
      required(await service.reverseJournal(databaseName(request), params.id, actorEmail(request)))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/journals/:id/cancel",
    schemas: { body: cancelBodySchema, params: idSchema, response: journalSchema },
    handler: async ({ body, params, request }) =>
      required(await service.cancelJournal(databaseName(request), params.id, body.reason))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/accounts/journals/:id",
    schemas: { params: idSchema, response: journalSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteJournal(databaseName(request), params.id))
  });

  // Ledger
  getById("/accounts/ledger/:id", ledgerSchema, (db, id) => service.ledgerForAccount(db, id));

  // Periods
  get("/accounts/periods", z.array(periodSchema), (db) => service.listPeriods(db));
  getById("/accounts/periods/:id", periodSchema, (db, id) => service.getPeriod(db, id));
  registerContractRoute(app, {
    method: "POST",
    url: "/accounts/periods",
    schemas: { body: periodSaveSchema, response: periodSchema },
    handler: ({ body, request }) => service.createPeriod(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PATCH",
    url: "/accounts/periods/:id/status",
    schemas: { body: periodStatusBodySchema, params: idSchema, response: periodSchema },
    handler: async ({ body, params, request }) =>
      required(await service.setPeriodStatus(databaseName(request), params.id, body.status))
  });
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveAccountsDatabaseName(Array.isArray(value) ? value[0] : value);
}

function actorEmail(request: FastifyRequest) {
  const authorization = request.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) return "system:migration";
  try {
    const payload = JSON.parse(
      Buffer.from(authorization.slice("Bearer ".length).split(".")[1] ?? "", "base64").toString()
    ) as { email?: string };
    return payload.email || "system:migration";
  } catch {
    return "system:migration";
  }
}

function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("The requested Accounting record was not found.");
  return value;
}