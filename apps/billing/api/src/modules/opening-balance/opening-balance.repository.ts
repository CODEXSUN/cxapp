import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getBillingDatabase } from "../../database/billing-database.js";
import { currentBillingScope } from "../../auth/billing-scope.js";
import type { OpeningBalanceInput, OpeningBalanceRole } from "./opening-balance.types.js";

export class OpeningBalanceRepository {
  async list(databaseName: string) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const items = await sql<{
      id: string;
      contactId: number;
      contactName: string;
      currencyId: number;
      currencyCode: string;
      partyRole: OpeningBalanceRole;
      amount: number | string;
      reason: string;
      companyId: number;
      financialYearId: number;
      assignLegacy: number;
    }>`SELECT b.uuid AS id, b.contact_id AS contactId, c.name AS contactName,
      b.currency_id AS currencyId, currency.name AS currencyCode, b.party_role AS partyRole,
      b.amount, b.reason, b.company_id AS companyId, b.financial_year_id AS financialYearId,
      EXISTS(SELECT 1 FROM billing_opening_balance_legacy_assignments a WHERE a.opening_balance_id=b.id) AS assignLegacy
      FROM billing_opening_balances b JOIN core_contacts c ON c.id=b.contact_id
      JOIN core_currencies currency ON currency.id=b.currency_id
      WHERE b.company_id=${scope.companyId} AND b.financial_year_id=${scope.financialYearId}
      ORDER BY c.name, b.party_role`.execute(database);
    const contacts = await sql<{
      id: number;
      name: string;
      legacyAmount: number | string;
    }>`SELECT id, name, COALESCE(opening_balance,0) AS legacyAmount FROM core_contacts
       WHERE deleted_at IS NULL ORDER BY name,id`.execute(database);
    const currencies = await sql<{
      id: number;
      name: string;
    }>`SELECT id,name FROM core_currencies WHERE status='active' AND UPPER(name)='INR' ORDER BY id`.execute(
      database
    );
    return {
      items: items.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        assignLegacy: Boolean(row.assignLegacy)
      })),
      contacts: contacts.rows.map((row) => ({ ...row, legacyAmount: Number(row.legacyAmount) })),
      currencies: currencies.rows
    };
  }

  async save(databaseName: string, input: OpeningBalanceInput, actor: string) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    await database.transaction().execute(async (transaction) => {
      const parent = await sql<{
        id: number;
        opening_balance: number | string;
      }>`SELECT id, opening_balance FROM core_contacts
        WHERE id=${input.contactId} AND status='active' AND deleted_at IS NULL FOR UPDATE`.execute(
        transaction
      );
      if (!parent.rows[0]) throw AppError.validation("Select an active contact.");
      const valid = await sql<{
        valid: number;
      }>`SELECT EXISTS(SELECT 1 FROM core_companies WHERE id=${scope.companyId} AND status='active')
        AND EXISTS(SELECT 1 FROM core_financial_years WHERE id=${scope.financialYearId} AND status='active')
        AND EXISTS(SELECT 1 FROM core_currencies WHERE id=${input.currencyId} AND status='active' AND UPPER(name)='INR') AS valid`.execute(
        transaction
      );
      if (!valid.rows[0]?.valid)
        throw AppError.validation("Select an active company, financial year, and INR currency.");
      const existing = await sql<{
        id: number;
        amount: number | string;
      }>`SELECT id,amount FROM billing_opening_balances
        WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
          AND contact_id=${input.contactId} AND party_role=${input.partyRole} FOR UPDATE`.execute(
        transaction
      );
      if (existing.rows[0]) {
        await sql`UPDATE billing_opening_balances SET amount=${input.amount},reason=${input.reason},currency_id=${input.currencyId}
          WHERE id=${existing.rows[0].id}`.execute(transaction);
      } else {
        await sql`INSERT INTO billing_opening_balances
        (uuid,company_id,financial_year_id,contact_id,currency_id,party_role,amount,reason,created_by)
        VALUES (${id()},${scope.companyId},${scope.financialYearId},${input.contactId},${input.currencyId},
          ${input.partyRole},${input.amount},${input.reason},${actor})`.execute(
        transaction
      );
      }
      const saved = await sql<{ id: number }>`SELECT id FROM billing_opening_balances
        WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
          AND contact_id=${input.contactId} AND party_role=${input.partyRole}`.execute(transaction);
      const openingId = saved.rows[0]!.id;
      if (input.assignLegacy) {
        const assignment = await sql<{ opening_balance_id: number }>`SELECT opening_balance_id
          FROM billing_opening_balance_legacy_assignments WHERE contact_id=${input.contactId}
          AND party_role=${input.partyRole} FOR UPDATE`.execute(transaction);
        if (assignment.rows[0] && assignment.rows[0].opening_balance_id !== openingId)
          throw AppError.conflict(
            "This legacy opening is already assigned to another company or financial year."
          );
        if (!assignment.rows[0]) await sql`INSERT INTO billing_opening_balance_legacy_assignments
          (uuid,opening_balance_id,contact_id,party_role,legacy_amount,created_by)
          VALUES (${id()},${openingId},${input.contactId},${input.partyRole},${parent.rows[0].opening_balance ?? 0},${actor})`.execute(
          transaction
        );
      }
      await sql`INSERT INTO billing_opening_balance_activities
        (uuid,opening_balance_id,previous_amount,amount,reason,created_by)
        VALUES (${id()},${openingId},${existing.rows[0]?.amount ?? null},${input.amount},${input.reason},${actor})`.execute(
        transaction
      );
    });
    return this.list(databaseName);
  }
}

export async function readOpeningBalanceOverrides(
  databaseName: string,
  partyRole: OpeningBalanceRole
) {
  const database = await getBillingDatabase(databaseName);
  const scope = currentBillingScope();
  const rows = await sql<{ contact_id: number; amount: number | string }>`
    SELECT c.id AS contact_id, COALESCE(b.amount, CASE WHEN a.id IS NOT NULL THEN 0 ELSE c.opening_balance END,0) AS amount
    FROM core_contacts c LEFT JOIN billing_opening_balances b ON b.contact_id=c.id
      AND b.company_id=${scope.companyId} AND b.financial_year_id=${scope.financialYearId} AND b.party_role=${partyRole}
    LEFT JOIN billing_opening_balance_legacy_assignments a ON a.contact_id=c.id AND a.party_role=${partyRole}
    WHERE b.id IS NOT NULL OR a.id IS NOT NULL`.execute(database);
  return new Map(rows.rows.map((row) => [row.contact_id, Number(row.amount)]));
}

function id() {
  return randomBytes(4).toString("hex");
}
