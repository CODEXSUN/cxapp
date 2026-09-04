import { z } from "zod";
import type { ContactAddress, ContactSavePayload } from "./contact.types";

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

export function preserveOptionalTextInput(value: string) {
  return value === "" ? null : value;
}

export function prepareContactPayloadForSave(form: ContactSavePayload): ContactSavePayload {
  return {
    ...form,
    code: canonicalContactCode(form.code),
    name: form.name.trim(),
    legalName: trimmedNullable(form.legalName),
    gstin: trimmedNullable(form.gstin),
    pan: trimmedNullable(form.pan),
    msmeNo: trimmedNullable(form.msmeNo),
    msmeCategory: trimmedNullable(form.msmeCategory),
    tanNo: trimmedNullable(form.tanNo),
    website: trimmedNullable(form.website),
    description: trimmedNullable(form.description),
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

function canonicalContactCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hasAddressValue(item: ContactAddress) {
  return Boolean(
    item.addressTypeId ||
    item.addressLine1.trim() ||
    item.addressLine2?.trim() ||
    item.countryId ||
    item.stateId ||
    item.districtId ||
    item.cityId ||
    item.pincodeId
  );
}

function trimmedNullable(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}
