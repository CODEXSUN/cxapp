import { z } from "zod";
export const openingBalanceSchema = z.object({
  contactId: z.number().int().positive("Select a contact."),
  currencyId: z.number().int().positive("Select a currency."),
  partyRole: z.enum(["customer", "supplier"]),
  amount: z.number().finite(),
  reason: z.string().trim().min(1, "Enter a reason."),
  assignLegacy: z.boolean()
});
