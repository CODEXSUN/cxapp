import type { FastifyInstance } from "fastify";
import { registerContractRoute } from "@cxapp/framework/http";
import { z } from "zod";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { overviewService } from "./overview.service.js";

const response = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  financialYearName: z.string(),
  kpis: z.array(
    z.object({
      caption: z.string(),
      title: z.string(),
      value: z.string()
    })
  ),
  projectedAt: z.string(),
  status: z.enum(["ready"])
});

export async function registerOverviewRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/accounts/overview",
    schemas: { response },
    handler: () => {
      const scope = currentAccountsScope();
      return overviewService.get({
        companyId: scope.companyId,
        financialYearId: scope.financialYearId
      });
    }
  });
}