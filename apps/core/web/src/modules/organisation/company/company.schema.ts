import { z } from "zod";

const nullableText = z.string().trim().nullable();
const nullableId = z.number().int().positive().nullable();

export const companySchema = z.object({
  code: z.string().trim().min(1, "Code is required.").max(80),
  name: z.string().trim().min(1, "Company name is required.").max(191),
  legalName: nullableText,
  industryId: nullableId,
  gstin: nullableText,
  pan: nullableText,
  msmeNo: nullableText,
  msmeCategory: nullableText,
  tanNo: nullableText,
  tdsAvailable: z.boolean(),
  tcsAvailable: z.boolean(),
  website: nullableText.refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Website must start with http:// or https://."
  }),
  description: nullableText,
  logoPath: nullableText,
  logoDarkPath: nullableText,
  status: z.enum(["active", "suspend"]),
  isActive: z.boolean(),
  emails: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      email: z.string().trim().email(),
      emailType: z.string().trim().min(1),
      isPrimary: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  ),
  phones: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      phone: z.string().trim().min(1),
      phoneType: z.string().trim().min(1),
      isPrimary: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  ),
  addresses: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      addressTypeId: nullableId,
      addressTypeName: nullableText,
      addressLine1: z.string().trim(),
      addressLine2: nullableText,
      countryId: nullableId,
      countryName: nullableText,
      stateId: nullableId,
      stateName: nullableText,
      districtId: nullableId,
      districtName: nullableText,
      cityId: nullableId,
      cityName: nullableText,
      pincodeId: nullableId,
      pincodeName: nullableText,
      isDefault: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  ),
  bankAccounts: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      bankNameId: nullableId,
      bankName: nullableText,
      accountType: nullableText,
      accountNumber: z.string().trim(),
      holderName: nullableText,
      ifsc: nullableText,
      branch: nullableText,
      isPrimary: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  ),
  socialLinks: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      platform: z.string().trim().min(1),
      url: z.string().trim(),
      status: z.enum(["active", "inactive"]),
      isActive: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  )
});
