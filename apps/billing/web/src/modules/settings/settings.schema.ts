import { z } from "zod";

export const salesSettingsSchema = z.object({
  features: z.object({
    exportSales: z.boolean(),
    quotation: z.boolean(),
    tconnect: z.boolean()
  }),
  gstApiMode: z.enum(["none", "einvoice_eway", "eway_only"]),
  layout: z.object({
    useColour: z.boolean(),
    useDc: z.boolean(),
    useEinvoice: z.boolean(),
    useEway: z.boolean(),
    usePo: z.boolean(),
    useSize: z.boolean()
  }),
  numbering: z.record(
    z.enum(["quotation", "sales", "purchase", "exportSales", "receipt", "payment"]),
    z.object({
      automatic: z.boolean(),
      nextNumber: z.number().int().positive(),
      padding: z.number().int().min(1).max(12),
      prefix: z.string(),
      separator: z.string(),
      suffix: z.string(),
      usePrefix: z.boolean(),
      useSeparator: z.boolean(),
      useSuffix: z.boolean()
    })
  ),
  customise: z.object({
    documentTitles: z.object({
      payment: z.string(),
      purchase: z.string(),
      quotation: z.string(),
      receipt: z.string(),
      sales: z.string()
    }),
    printLanguage: z.literal("english")
  }),
  printing: z.object({
    addressMode: z.enum(["billing_only", "billing_and_shipping"]),
    customTerms: z.string(),
    letterhead: z.object({
      addressColor: z.string(),
      addressFont: z.string(),
      addressSize: z.number(),
      borderColor: z.string(),
      companyColor: z.string(),
      companyFont: z.string(),
      companySize: z.number(),
      contactSize: z.number(),
      headerHeightMm: z.number(),
      logoHeightMm: z.number(),
      logoLeftMm: z.number(),
      logoTopMm: z.number(),
      logoWidthMm: z.number(),
      taxSize: z.number()
    }),
    printAccountNumber: z.boolean(),
    printQrAccountDetails: z.boolean(),
    printWithLogo: z.boolean()
  })
});
