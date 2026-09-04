import { z } from "zod";
import type { CompanyAddress, CompanySavePayload } from "./company.types";

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

export function preserveOptionalTextInput(value: string) {
  return value === "" ? null : value;
}

export function prepareCompanyPayloadForSave(form: CompanySavePayload): CompanySavePayload {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    legalName: trimmedNullable(form.legalName),
    gstin: trimmedNullable(form.gstin),
    pan: trimmedNullable(form.pan),
    msmeNo: trimmedNullable(form.msmeNo),
    msmeCategory: trimmedNullable(form.msmeCategory),
    tanNo: trimmedNullable(form.tanNo),
    website: trimmedNullable(form.website),
    description: trimmedNullable(form.description),
    logoPath: trimmedNullable(form.logoPath),
    logoDarkPath: trimmedNullable(form.logoDarkPath),
    emails: form.emails
      .filter((item) => item.email.trim())
      .map((item, index) => ({
        ...item,
        email: item.email.trim(),
        emailType: item.emailType.trim(),
        sortOrder: index + 1
      })),
    phones: form.phones
      .filter((item) => item.phone.trim())
      .map((item, index) => ({
        ...item,
        phone: item.phone.trim(),
        phoneType: item.phoneType.trim(),
        sortOrder: index + 1
      })),
    addresses: form.addresses.filter(hasAddressValue).map((item, index) => ({
      ...item,
      addressTypeName: trimmedNullable(item.addressTypeName),
      addressLine1: item.addressLine1.trim(),
      addressLine2: trimmedNullable(item.addressLine2),
      countryName: trimmedNullable(item.countryName),
      stateName: trimmedNullable(item.stateName),
      districtName: trimmedNullable(item.districtName),
      cityName: trimmedNullable(item.cityName),
      pincodeName: trimmedNullable(item.pincodeName),
      sortOrder: index + 1
    })),
    bankAccounts: form.bankAccounts
      .filter((item) => item.accountNumber.trim())
      .map((item, index) => ({
        ...item,
        bankName: trimmedNullable(item.bankName),
        accountType: trimmedNullable(item.accountType),
        accountNumber: item.accountNumber.trim(),
        holderName: trimmedNullable(item.holderName),
        ifsc: trimmedNullable(item.ifsc),
        branch: trimmedNullable(item.branch),
        sortOrder: index + 1
      })),
    socialLinks: form.socialLinks
      .filter((item) => item.url.trim())
      .map((item, index) => ({
        ...item,
        platform: item.platform.trim(),
        url: item.url.trim(),
        sortOrder: index + 1
      }))
  };
}

function hasAddressValue(item: CompanyAddress) {
  return Boolean(
    item.addressLine1.trim() ||
    item.addressLine2?.trim() ||
    item.addressTypeId ||
    item.countryId ||
    item.pincodeId
  );
}

function trimmedNullable(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}
