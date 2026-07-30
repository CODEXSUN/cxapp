import { z } from "zod";

const lookupIdValueSchema = z.union([z.number().int().positive(), z.string().min(1)]);
const nullableLookupIdSchema = lookupIdValueSchema.nullable();
const activeStatusSchema = z.enum(["active", "inactive"]);

const contactAddressSchema = z.object({
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  addressTypeId: nullableLookupIdSchema,
  addressTypeName: z.string().nullable(),
  cityId: nullableLookupIdSchema,
  cityName: z.string().nullable(),
  countryId: nullableLookupIdSchema,
  countryName: z.string().nullable(),
  districtId: nullableLookupIdSchema,
  districtName: z.string().nullable(),
  id: lookupIdValueSchema.optional(),
  isDefault: z.boolean().optional(),
  pincodeId: nullableLookupIdSchema,
  pincodeName: z.string().nullable(),
  stateId: nullableLookupIdSchema,
  stateName: z.string().nullable()
});

const contactEmailSchema = z.object({
  email: z.email(),
  emailType: z.string(),
  isPrimary: z.boolean()
});

const contactPhoneSchema = z.object({
  isPrimary: z.boolean(),
  phone: z.string(),
  phoneType: z.string()
});

const contactMutationSchema = z.object({
  addresses: z.array(contactAddressSchema),
  emails: z.array(contactEmailSchema),
  gstin: z.string(),
  isActive: z.boolean(),
  legalName: z.string(),
  name: z.string().min(1),
  phones: z.array(contactPhoneSchema),
  typeId: z.number().int().positive()
});

const locationMutationSchema = z.object({
  area: z.string().optional(),
  cityId: nullableLookupIdSchema.optional(),
  cityName: z.string().nullable().optional(),
  code: z.string().min(1),
  countryId: nullableLookupIdSchema,
  countryName: z.string(),
  districtId: nullableLookupIdSchema.optional(),
  districtName: z.string().nullable().optional(),
  name: z.string().min(1),
  pincode: z.string().optional(),
  sortOrder: z.number().int(),
  stateId: nullableLookupIdSchema.optional(),
  stateName: z.string().nullable().optional(),
  status: activeStatusSchema
});

const namedLookupMutationSchema = z.object({
  address: z.string().optional(),
  code: z.string().optional(),
  contactNo: z.string().optional(),
  contactPerson: z.string().optional(),
  description: z.string().optional(),
  gst: z.string().optional(),
  hsnCode: z.string().optional(),
  hsnCodeId: nullableLookupIdSchema.optional(),
  isActive: z.boolean(),
  name: z.string().min(1),
  openingRate: z.number().nonnegative().optional(),
  productCategoryId: nullableLookupIdSchema.optional(),
  productCategoryName: z.string().nullable().optional(),
  ratePercent: z.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  taxId: nullableLookupIdSchema.optional(),
  taxName: z.string().nullable().optional(),
  taxRate: z.number().nonnegative().optional(),
  typeName: z.string().optional(),
  unitId: nullableLookupIdSchema.optional(),
  unitName: z.string().optional(),
  vehicleNo: z.string().optional()
});

export const coreLookupMutationSchema = z.union([
  contactMutationSchema,
  contactAddressSchema,
  locationMutationSchema,
  namedLookupMutationSchema
]);

export const coreLookupRecordSchema = z.object({
  addresses: z.array(contactAddressSchema).optional(),
  area: z.string().nullable().optional(),
  areaName: z.string().nullable().optional(),
  cityId: nullableLookupIdSchema.optional(),
  cityName: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  contactNo: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  countryId: nullableLookupIdSchema.optional(),
  countryName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  districtId: nullableLookupIdSchema.optional(),
  districtName: z.string().nullable().optional(),
  emails: z.array(contactEmailSchema).optional(),
  gst: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  hsnCode: z.string().nullable().optional(),
  hsnCodeId: nullableLookupIdSchema.optional(),
  id: lookupIdValueSchema,
  isActive: z.boolean().nullable().optional(),
  legalName: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  openingRate: z.number().nullable().optional(),
  phones: z.array(contactPhoneSchema).optional(),
  pincode: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  primaryEmail: z.string().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  productCategoryId: nullableLookupIdSchema.optional(),
  productCategoryName: z.string().nullable().optional(),
  ratePercent: z.number().nullable().optional(),
  stateId: nullableLookupIdSchema.optional(),
  stateName: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "suspend", "deleted"]).optional(),
  taxId: nullableLookupIdSchema.optional(),
  taxName: z.string().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  typeId: nullableLookupIdSchema.optional(),
  typeName: z.string().nullable().optional(),
  unitId: nullableLookupIdSchema.optional(),
  unitName: z.string().nullable().optional(),
  vehicleNo: z.string().nullable().optional(),
  workOrderNo: z.string().nullable().optional()
});

export const coreLookupListSchema = z.array(coreLookupRecordSchema);
export type CoreLookupMutation = z.infer<typeof coreLookupMutationSchema>;
export type CoreLookupRecord = z.infer<typeof coreLookupRecordSchema>;
