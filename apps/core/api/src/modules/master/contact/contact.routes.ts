import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ContactService } from "./contact.service.js";

export const CONTACT_COLLECTION_PATH = "/core/master/contacts";

const service = new ContactService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Contact ID must be numeric.") });
const addressIdSchema = idSchema.extend({
  addressId: z.string().regex(/^\d+$/, "Address ID must be numeric.")
});
const nullableString = z.string().trim().nullable();
const nullableId = z.number().int().positive().nullable();
const contactStatusSchema = z.enum(["active", "suspend", "deleted"]);
const socialStatusSchema = z.enum(["active", "inactive"]);

const emailSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  emailType: z.string(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().positive()
});
const phoneSchema = z.object({
  id: z.number().int().positive(),
  phone: z.string(),
  phoneType: z.string(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().positive()
});
const addressSchema = z.object({
  id: z.number().int().positive(),
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
  id: z.number().int().positive(),
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
  id: z.number().int().positive(),
  platform: z.string(),
  url: z.string(),
  status: socialStatusSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int().positive()
});

const contactSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string().length(8),
  code: z.string(),
  name: z.string(),
  legalName: nullableString,
  typeId: nullableId,
  typeName: nullableString,
  groupId: nullableId,
  groupName: nullableString,
  primaryPhone: nullableString,
  primaryEmail: nullableString,
  gstin: nullableString,
  pan: nullableString,
  msmeNo: nullableString,
  msmeCategory: nullableString,
  tanNo: nullableString,
  tdsAvailable: z.boolean(),
  tcsAvailable: z.boolean(),
  openingBalance: z.number(),
  creditLimit: z.number(),
  website: nullableString,
  description: nullableString,
  status: contactStatusSchema,
  isActive: z.boolean(),
  emails: z.array(emailSchema),
  phones: z.array(phoneSchema),
  addresses: z.array(addressSchema),
  bankAccounts: z.array(bankAccountSchema),
  socialLinks: z.array(socialLinkSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable()
});

const emailPayloadSchema = emailSchema.omit({ id: true, sortOrder: true }).extend({
  id: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().positive().optional()
});
const phonePayloadSchema = phoneSchema.omit({ id: true, sortOrder: true }).extend({
  id: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().positive().optional()
});
const addressPayloadSchema = addressSchema.omit({ id: true, sortOrder: true }).extend({
  id: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().positive().optional()
});
const addressUpdateSchema = addressPayloadSchema.omit({ id: true, sortOrder: true }).partial();
const bankAccountPayloadSchema = bankAccountSchema.omit({ id: true, sortOrder: true }).extend({
  id: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().positive().optional()
});
const socialLinkPayloadSchema = socialLinkSchema
  .omit({ id: true, isActive: true, sortOrder: true })
  .extend({
    id: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().positive().optional()
  });

const payloadSchema = z.object({
  code: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1, "Contact name is required.").max(191),
  legalName: nullableString.optional(),
  typeId: z.number().int().positive("Contact type is required."),
  groupId: nullableId.optional(),
  gstin: nullableString.optional(),
  pan: nullableString.optional(),
  msmeNo: nullableString.optional(),
  msmeCategory: nullableString.optional(),
  tanNo: nullableString.optional(),
  tdsAvailable: z.boolean().optional(),
  tcsAvailable: z.boolean().optional(),
  openingBalance: z.number().finite().optional(),
  creditLimit: z.number().finite().min(0).optional(),
  website: nullableString.optional(),
  description: nullableString.optional(),
  status: z.enum(["active", "suspend"]).optional(),
  isActive: z.boolean().optional(),
  emails: z.array(emailPayloadSchema).optional(),
  phones: z.array(phonePayloadSchema).optional(),
  addresses: z.array(addressPayloadSchema).optional(),
  bankAccounts: z.array(bankAccountPayloadSchema).optional(),
  socialLinks: z.array(socialLinkPayloadSchema).optional()
});
const querySchema = z.object({ search: z.string().trim().optional() });
const nextCodeSchema = z.object({ code: z.string() });

export async function registerContactRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: querySchema, response: z.array(contactSchema) },
    url: CONTACT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: () => service.nextCode(),
    method: "GET",
    schemas: { response: nextCodeSchema },
    url: `${CONTACT_COLLECTION_PATH}/next-code`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.find(params.id)),
    method: "GET",
    schemas: { params: idSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body }) => service.create(body),
    method: "POST",
    schemas: { body: payloadSchema, response: contactSchema },
    url: CONTACT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: ({ body, params }) => service.update(params.id, body),
    method: "PUT",
    schemas: { body: payloadSchema, params: idSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body, params }) => service.updateAddress(params.id, params.addressId, body),
    method: "PUT",
    schemas: { body: addressUpdateSchema, params: addressIdSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id/addresses/:addressId`
  });
  registerContractRoute(app, {
    handler: ({ body, params }) => service.createAddress(params.id, body),
    method: "POST",
    schemas: { body: addressUpdateSchema, params: idSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id/addresses`
  });
  registerLifecycleRoute(app, "activate", true);
  registerLifecycleRoute(app, "deactivate", false);
  registerContractRoute(app, {
    handler: ({ params }) => service.forceDelete(params.id),
    method: "DELETE",
    schemas: { params: idSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id/force`
  });
}

function registerLifecycleRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  active: boolean
) {
  registerContractRoute(app, {
    handler: ({ params }) => service.setActive(params.id, active),
    method: "POST",
    schemas: { params: idSchema, response: contactSchema },
    url: `${CONTACT_COLLECTION_PATH}/:id/${action}`
  });
}

function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Contact was not found.");
  return record;
}
