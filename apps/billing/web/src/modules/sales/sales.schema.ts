import { z } from "zod";

const saleEinvoiceSchema = z
  .object({
    ackDate: z.string(),
    ackNo: z.string(),
    irn: z.string(),
    signedQr: z.string(),
    status: z.enum(["not-generated", "generated"])
  })
  .strict();

const saleEwaySchema = z
  .object({
    billDate: z.string(),
    billNo: z.string(),
    notes: z.string(),
    part: z.enum(["Part A", "Part B"]),
    status: z.enum(["not-generated", "generated"]),
    transport: z.string(),
    transportGst: z.string(),
    transportId: z.number().int().positive().nullable(),
    vehicleNo: z.string()
  })
  .strict();

export const saleLineItemSchema = z
  .object({
    colour: z.string(),
    colourId: z.number().int().positive().nullable(),
    dcNo: z.string(),
    description: z.string().trim(),
    hsnCode: z.string().trim().min(1, "HSN code is required."),
    hsnCodeId: z.number().int().positive().nullable(),
    poNo: z.string(),
    productId: z.number().int().positive().nullable(),
    productName: z.string(),
    quantity: z.number().positive("Quantity must be greater than zero."),
    rate: z.number().nonnegative("Rate must be zero or more."),
    size: z.string(),
    sizeId: z.number().int().positive().nullable(),
    taxId: z.number().int().positive().nullable(),
    taxRate: z.number().min(0, "Tax rate must be zero or more."),
    unit: z.string().trim().min(1, "Unit is required."),
    unitId: z.number().int().positive("Select a persisted unit.")
  })
  .strict();

export const salesSchema = z
  .object({
    billingAddress: z.string().trim().min(1, "Billing address is required."),
    billingAddressId: z.number().int().positive("Select a persisted billing address."),
    companyId: z.number().int().positive("Default Company is required."),
    currencyCode: z.string().trim().length(3, "Currency code must be 3 letters."),
    currencyId: z.number().int().positive("Currency is required."),
    customerEmail: z.union([
      z.literal(""),
      z.string().trim().email("Enter a valid customer email.")
    ]),
    customerId: z.number().int().positive("Select a persisted customer."),
    customerName: z.string().trim().min(1, "Customer name is required."),
    customerPhone: z.string(),
    einvoice: saleEinvoiceSchema.optional(),
    eway: saleEwaySchema.optional(),
    invoiceNumber: z.string().trim().optional(),
    financialYearId: z.number().int().positive("Financial Year is required."),
    issuedOn: z.iso.date("Invoice date is required."),
    items: z.array(saleLineItemSchema),
    notes: z.string(),
    ledgerId: z.number().int().positive().nullable(),
    roundOff: z.number(),
    saleNumber: z.string(),
    salesLedger: z.string(),
    shippingAddress: z.string().trim().min(1, "Shipping address is required."),
    shippingAddressId: z.number().int().positive("Select a persisted shipping address."),
    status: z.enum(["draft", "confirmed", "cancelled"]),
    taxType: z.enum(["cgst-sgst", "igst"]),
    terms: z.string(),
    workOrderId: z.number().int().positive().nullable(),
    workOrderNo: z.string()
  })
  .strict();
