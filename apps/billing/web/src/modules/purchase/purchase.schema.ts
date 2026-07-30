import { z } from "zod";

export const purchaseLineSchema = z.object({
  colour: z.string(),
  colourId: z.number().int().positive().nullable(),
  dcNo: z.string(),
  description: z.string().trim(),
  hsnCode: z.string(),
  hsnCodeId: z.number().int().positive().nullable(),
  poNo: z.string(),
  productId: z.number().int().positive().nullable(),
  productName: z.string(),
  quantity: z.number().positive("Quantity must be greater than zero."),
  rate: z.number().nonnegative("Rate cannot be negative."),
  size: z.string(),
  sizeId: z.number().int().positive().nullable(),
  taxId: z.number().int().positive().nullable(),
  taxRate: z.number().nonnegative("Tax cannot be negative."),
  unit: z.string().trim().min(1, "Unit is required."),
  unitId: z.number().int().positive("Select a persisted unit.")
});

export const purchaseSchema = z.object({
  billingAddress: z.string(),
  billingAddressId: z.number().int().positive("Select a persisted billing address."),
  companyId: z.number().int().positive("Default Company is required."),
  currencyCode: z.string().trim().length(3),
  currencyId: z.number().int().positive("Currency is required."),
  einvoice: z.object({
    ackDate: z.string(),
    ackNo: z.string(),
    irn: z.string(),
    signedQr: z.string()
  }),
  eway: z.object({
    billDate: z.union([z.iso.date(), z.literal("")]),
    billNo: z.string(),
    transport: z.string(),
    vehicleNo: z.string()
  }),
  supplierEmail: z.string(),
  supplierId: z.number().int().positive("Select a persisted supplier."),
  supplierName: z.string().trim().min(1, "Supplier is required."),
  supplierPhone: z.string(),
  supplierBillDate: z.union([z.iso.date(), z.literal("")]).optional(),
  supplierBillNo: z.string().optional(),
  issuedOn: z.iso.date("Purchase date is required."),
  financialYearId: z.number().int().positive("Financial Year is required."),
  items: z.array(purchaseLineSchema),
  ledgerId: z.number().int().positive().nullable(),
  notes: z.string(),
  invoiceNumber: z.string().trim().min(1, "Purchase number is required."),
  roundOff: z.number().optional(),
  salesLedger: z.string(),
  shippingAddress: z.string(),
  shippingAddressId: z.number().int().positive("Select a persisted shipping address."),
  status: z.enum(["draft", "confirmed", "cancelled"]),
  taxType: z.enum(["cgst-sgst", "igst"]),
  terms: z.string(),
  workOrderId: z.number().int().positive().nullable(),
  workOrderNo: z.string()
});
