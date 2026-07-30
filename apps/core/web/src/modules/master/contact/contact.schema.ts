import { z } from "zod";

const nullableText = z.string().trim().nullable();
const nullableId = z.number().int().positive().nullable();

export const contactSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(80)
    .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "Use letters, numbers, and hyphens only."),
  name: z.string().trim().min(1, "Contact name is required.").max(191),
  legalName: nullableText,
  typeId: z.number().int().positive("Contact type is required."),
  groupId: nullableId,
  gstin: nullableText,
  pan: nullableText,
  msmeNo: nullableText,
  msmeCategory: nullableText,
  tanNo: nullableText,
  tdsAvailable: z.boolean(),
  tcsAvailable: z.boolean(),
  openingBalance: z.number().finite(),
  creditLimit: z.number().finite().min(0, "Credit limit cannot be negative."),
  website: nullableText.refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Website must start with http:// or https://."
  }),
  description: nullableText,
  status: z.enum(["active", "suspend"]),
  isActive: z.boolean(),
  emails: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      email: z.string().trim().email("Enter a valid email address."),
      emailType: z.string().trim().min(1),
      isPrimary: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  ),
  phones: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      phone: z.string().trim().min(1, "Phone is required."),
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
      accountNumber: z.string().trim().min(1, "Account number is required."),
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
      url: z.string().trim().url("Enter a valid social URL."),
      status: z.enum(["active", "inactive"]),
      isActive: z.boolean(),
      sortOrder: z.number().int().positive()
    })
  )
});
