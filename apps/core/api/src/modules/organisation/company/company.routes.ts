import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { CompanyService } from "./company.service.js";

export const COMPANY_COLLECTION_PATH = "/core/organisation/companies";
const service = new CompanyService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Company ID must be numeric.") });
const nullableString = z.string().trim().nullable();
const nullableId = z.number().int().positive().nullable();
const statusSchema = z.enum(["active", "suspend"]);
const socialStatusSchema = z.enum(["active", "inactive"]);

const emailSchema = z.object({
  id: z.number().int().nonnegative(),
  email: z.string(),
  emailType: z.string(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().positive()
});
const phoneSchema = z.object({
  id: z.number().int().nonnegative(),
  phone: z.string(),
  phoneType: z.string(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().positive()
});
const addressSchema = z.object({
  id: z.number().int().nonnegative(),
  addressTypeId: nullableId,
  addressTypeName: nullableString,
  addressLine1: z.string(),
  addressLine2: nullableString,
  countryId: nullableId,
  countryName: nullableString,
  stateId: nullableId,
  stateName: nullableString,
  districtId: nullableId,
  districtName: nullableString,
  cityId: nullableId,
  cityName: nullableString,
  pincodeId: nullableId,
  pincodeName: nullableString,
  isDefault: z.boolean(),
  sortOrder: z.number().int().positive()
});
const bankAccountSchema = z.object({
  id: z.number().int().nonnegative(),
  bankNameId: nullableId,
  bankName: nullableString,
  accountType: nullableString,
  accountNumber: z.string(),
  holderName: nullableString,
  ifsc: nullableString,
  branch: nullableString,
  isPrimary: z.boolean(),
  sortOrder: z.number().int().positive()
});
const socialLinkSchema = z.object({
  id: z.number().int().nonnegative(),
  platform: z.string(),
  url: z.string(),
  status: socialStatusSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int().positive()
});

const companySchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  legalName: nullableString,
  primaryPhone: nullableString,
  primaryEmail: nullableString,
  gstin: nullableString,
  pan: nullableString,
  msmeNo: nullableString,
  msmeCategory: nullableString,
  tanNo: nullableString,
  tdsAvailable: z.boolean(),
  tcsAvailable: z.boolean(),
  website: nullableString,
  description: nullableString,
  logoPath: nullableString,
  logoDarkPath: nullableString,
  industryId: nullableId,
  industryName: nullableString,
  status: statusSchema,
  isActive: z.boolean(),
  emails: z.array(emailSchema),
  phones: z.array(phoneSchema),
  addresses: z.array(addressSchema),
  bankAccounts: z.array(bankAccountSchema),
  socialLinks: z.array(socialLinkSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});

const payloadSchema = z.object({
  code: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1, "Company name is required.").max(191),
  legalName: nullableString.optional(),
  gstin: nullableString.optional(),
  pan: nullableString.optional(),
  msmeNo: nullableString.optional(),
  msmeCategory: nullableString.optional(),
  tanNo: nullableString.optional(),
  tdsAvailable: z.boolean().optional(),
  tcsAvailable: z.boolean().optional(),
  website: nullableString.optional(),
  description: nullableString.optional(),
  logoPath: nullableString.optional(),
  logoDarkPath: nullableString.optional(),
  industryId: nullableId.optional(),
  status: statusSchema.optional(),
  isActive: z.boolean().optional(),
  emails: z.array(emailSchema).optional(),
  phones: z.array(phoneSchema).optional(),
  addresses: z.array(addressSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  socialLinks: z.array(socialLinkSchema).optional()
});
const querySchema = z.object({ search: z.string().trim().optional() });
export async function registerCompanyRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ?? ""),
    method: "GET",
    schemas: { querystring: querySchema, response: z.array(companySchema) },
    url: COMPANY_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.find(params.id)),
    method: "GET",
    schemas: { params: idSchema, response: companySchema },
    url: `${COMPANY_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body, request }) => service.create(body, request.headers.authorization),
    method: "POST",
    schemas: { body: payloadSchema, response: companySchema },
    url: COMPANY_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params, request }) =>
      required(await service.update(params.id, body, request.headers.authorization)),
    method: "PUT",
    schemas: { body: payloadSchema, params: idSchema, response: companySchema },
    url: `${COMPANY_COLLECTION_PATH}/:id`
  });
  lifecycle(app, "activate", true);
  lifecycle(app, "deactivate", false);
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idSchema, response: companySchema },
    url: `${COMPANY_COLLECTION_PATH}/:id/force`
  });
}
function lifecycle(app: FastifyInstance, action: "activate" | "deactivate", active: boolean) {
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, active)),
    method: "POST",
    schemas: { params: idSchema, response: companySchema },
    url: `${COMPANY_COLLECTION_PATH}/:id/${action}`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Company was not found or is protected.");
  return record;
}
