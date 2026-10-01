import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveBillingDatabaseName } from "../../database/billing-database.js";
import { OpeningBalanceService } from "./opening-balance.service.js";
import { currentBillingScope } from "../../auth/billing-scope.js";

const input = z.object({
  contactId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  partyRole: z.enum(["customer", "supplier"]),
  amount: z.number().finite(),
  reason: z.string().trim().min(1),
  assignLegacy: z.boolean()
});
const response = z.object({
  items: z.array(
    input.extend({
      id: z.string(),
      contactName: z.string(),
      currencyCode: z.string(),
      companyId: z.number(),
      financialYearId: z.number()
    })
  ),
  contacts: z.array(z.object({ id: z.number(), name: z.string(), legacyAmount: z.number() })),
  currencies: z.array(z.object({ id: z.number(), name: z.string() }))
});

export async function registerOpeningBalanceRoutes(app: FastifyInstance) {
  const service = new OpeningBalanceService();
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/opening-balances",
    schemas: { response },
    handler: async ({ request }) => service.list(databaseName(request))
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/opening-balances",
    schemas: { body: input, response },
    handler: async ({ request, body }) =>
      service.save(
        databaseName(request),
        body,
        currentBillingScope().actorEmail || `request:${request.id}`
      )
  });
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveBillingDatabaseName(Array.isArray(value) ? value[0] : value);
}
