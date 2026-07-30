import { randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getBillingDatabase } from "../../database/billing-database.js";
import { currentBillingScope } from "../../auth/billing-scope.js";
import type {
  Receipt,
  ReceiptActivity,
  ReceiptAllocation,
  ReceiptAllocationCandidate,
  ReceiptContext,
  ReceiptSavePayload,
  ReceiptStatus
} from "./receipt.types.js";

type ReceiptDatabase = Record<string, never>;
type ReceiptTransaction = Transaction<ReceiptDatabase>;
type HeaderRow = {
  allocated_amount: string | number;
  amount: string | number;
  company_id: number;
  company_name: string;
  created_at: string;
  currency_code: string;
  currency_id: number;
  customer_id: number;
  customer_name: string;
  discount_amount: string | number;
  financial_year_id: number;
  financial_year_name: string;
  id: number;
  ledger_id: number;
  ledger_name: string;
  line_number: number;
  notes: string | null;
  receipt_date: string;
  receipt_mode: Receipt["receiptMode"];
  receipt_number: string;
  reference_date: string | null;
  reference_no: string | null;
  round_off: string | number;
  status: ReceiptStatus;
  tds_amount: string | number;
  total_amount: string | number;
  unallocated_amount: string | number;
  updated_at: string;
  uuid: string;
};

export class ReceiptRepository {
  async defaultLedgerId(databaseName: string) {
    const database = await receiptDatabase(databaseName);
    const result = await sql<{ id: number }>`SELECT id FROM core_ledgers WHERE status='active'
      ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1`.execute(database);
    return Number(result.rows[0]?.id ?? 0);
  }

  async list(databaseName: string) {
    const database = await receiptDatabase(databaseName);
    const result = await selectHeaders().execute(database);
    return Promise.all(result.rows.map((row) => this.hydrate(database, row)));
  }
  async listPage(
    databaseName: string,
    options: { page: number; pageSize: number; search: string; status: string }
  ) {
    const database = await receiptDatabase(databaseName);
    const search = `%${options.search.trim()}%`;
    const page = {
      limit: options.pageSize,
      offset: (options.page - 1) * options.pageSize,
      search,
      status: options.status
    };
    const scope = currentBillingScope();
    const result = await selectHeaders(undefined, false, page).execute(database);
    const count = await sql<{
      total: string | number;
    }>`SELECT COUNT(*) AS total FROM billing_receipts r
      INNER JOIN core_contacts customer ON customer.id=r.customer_id INNER JOIN core_ledgers ledger ON ledger.id=r.ledger_id
      WHERE r.deleted_at IS NULL
      AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
      AND (${page.status}='all' OR r.status=${page.status})
      AND (${search}='%%' OR r.receipt_number LIKE ${search} OR customer.name LIKE ${search}
        OR ledger.name LIKE ${search} OR r.receipt_mode LIKE ${search} OR r.status LIKE ${search}
        OR COALESCE(r.reference_no,'') LIKE ${search})`.execute(database);
    return {
      items: await Promise.all(result.rows.map((row) => this.hydrate(database, row))),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(count.rows[0]?.total ?? 0)
    };
  }

  async get(databaseName: string, uuid: string) {
    const database = await receiptDatabase(databaseName);
    const result = await selectHeaders(uuid).execute(database);
    const row = result.rows[0];
    return row ? this.hydrate(database, row) : null;
  }

  async activity(databaseName: string, uuid: string): Promise<ReceiptActivity[] | null> {
    const database = await receiptDatabase(databaseName);
    const receipt = await internalReceipt(database, uuid);
    if (!receipt) return null;
    const result = await sql<{
      action: string;
      created_at: string;
      description: string;
      new_status: ReceiptStatus | null;
      previous_status: ReceiptStatus | null;
      uuid: string;
    }>`
      SELECT uuid, action, description, previous_status, new_status, created_at
      FROM billing_receipt_activities
      WHERE receipt_id = ${receipt.id}
      ORDER BY created_at DESC, id DESC
    `.execute(database);
    return result.rows.map((row) => ({
      action: row.action,
      createdAt: isoValue(row.created_at),
      description: row.description,
      id: row.uuid,
      newStatus: row.new_status,
      previousStatus: row.previous_status
    }));
  }

  async context(
    databaseName: string
  ): Promise<Omit<ReceiptContext, "suggestedReceiptNumber"> | null> {
    const database = await receiptDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<{
      company_id: number;
      company_name: string;
      currency_code: string;
      currency_id: number;
      financial_year_id: number;
      financial_year_name: string;
    }>`
      SELECT c.id AS company_id, c.name AS company_name, f.id AS financial_year_id,
             f.name AS financial_year_name, currency.id AS currency_id,
             currency.name AS currency_code
      FROM core_companies c
      CROSS JOIN core_financial_years f
      INNER JOIN core_currencies currency ON UPPER(currency.name) = 'INR' AND currency.status = 'active'
      WHERE c.id=${scope.companyId} AND c.status='active'
        AND f.id=${scope.financialYearId} AND f.status='active' LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row
      ? {
          companyId: row.company_id,
          companyName: row.company_name,
          currencyCode: row.currency_code,
          currencyId: row.currency_id,
          financialYearId: row.financial_year_id,
          financialYearName: row.financial_year_name
        }
      : null;
  }

  async findByNumber(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    number: string,
    excludeUuid?: string
  ) {
    const database = await receiptDatabase(databaseName);
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM billing_receipts
      WHERE company_id = ${companyId} AND financial_year_id = ${financialYearId}
        AND receipt_number = ${number} AND deleted_at IS NULL
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async validateReferences(databaseName: string, input: ReceiptSavePayload, excludeUuid?: string) {
    const database = await receiptDatabase(databaseName);
    const scope = currentBillingScope();
    const base = await sql<{
      company: number;
      currency: number;
      customer: number;
      financialYear: number;
      ledger: number;
    }>`
      SELECT
        EXISTS(SELECT 1 FROM core_companies WHERE id = ${input.companyId} AND id=${scope.companyId} AND status = 'active') AS company,
        EXISTS(SELECT 1 FROM core_financial_years WHERE id = ${input.financialYearId} AND id=${scope.financialYearId} AND status = 'active' AND ${input.receiptDate} BETWEEN start_date AND end_date) AS financialYear,
        EXISTS(SELECT 1 FROM core_currencies WHERE id = ${input.currencyId} AND status = 'active') AS currency,
        EXISTS(SELECT 1 FROM core_contacts WHERE id = ${input.customerId} AND status = 'active') AS customer,
        EXISTS(SELECT 1 FROM core_ledgers WHERE id = ${input.ledgerId} AND status = 'active') AS ledger
    `.execute(database);
    const allocations = await Promise.all(
      input.allocations.map(async (allocation) => {
        const result = await sql<{ customer_id: number; outstanding_amount: string | number }>`
        SELECT s.customer_id,
          GREATEST(s.amount - COALESCE(SUM(CASE WHEN r.status <> 'cancelled' ${excludeUuid ? sql`AND r.uuid <> ${excludeUuid}` : sql``} THEN a.allocated_amount ELSE 0 END), 0), 0) AS outstanding_amount
        FROM billing_sales s
        LEFT JOIN billing_receipt_allocations a ON a.sales_id = s.id
        LEFT JOIN billing_receipts r ON r.id = a.receipt_id
          AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
          AND r.deleted_at IS NULL
        WHERE s.uuid = ${allocation.saleId}
          AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
          AND s.status = 'confirmed' AND s.deleted_at IS NULL
        GROUP BY s.id, s.customer_id, s.amount
      `.execute(database);
        const row = result.rows[0];
        return Boolean(
          row &&
          row.customer_id === input.customerId &&
          Number(row.outstanding_amount) >= allocation.allocatedAmount
        );
      })
    );
    const row = base.rows[0];
    return {
      company: Boolean(row?.company),
      currency: Boolean(row?.currency),
      customer: Boolean(row?.customer),
      financialYear: Boolean(row?.financialYear),
      ledger: Boolean(row?.ledger),
      allocations: allocations.every(Boolean)
    };
  }

  async allocationCandidates(
    databaseName: string,
    customerId: number
  ): Promise<ReceiptAllocationCandidate[]> {
    const database = await receiptDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<{
      customer_id: number;
      document_date: string;
      document_no: string;
      document_total: string | number;
      outstanding_amount: string | number;
      sale_id: string;
    }>`
      SELECT s.uuid AS sale_id, s.customer_id, s.invoice_number AS document_no,
             s.issued_on AS document_date, s.amount AS document_total,
             GREATEST(s.amount - COALESCE(SUM(CASE WHEN r.status <> 'cancelled' THEN a.allocated_amount ELSE 0 END), 0), 0) AS outstanding_amount
      FROM billing_sales s
      LEFT JOIN billing_receipt_allocations a ON a.sales_id = s.id
      LEFT JOIN billing_receipts r ON r.id = a.receipt_id
        AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
        AND r.deleted_at IS NULL
      WHERE s.customer_id = ${customerId}
        AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
        AND s.status = 'confirmed' AND s.deleted_at IS NULL
      GROUP BY s.id, s.uuid, s.customer_id, s.invoice_number, s.issued_on, s.amount
      HAVING outstanding_amount > 0
      ORDER BY s.issued_on, s.line_number
    `.execute(database);
    return result.rows.map((row) => ({
      customerId: row.customer_id,
      documentDate: dateValue(row.document_date),
      documentNo: row.document_no,
      documentTotal: Number(row.document_total),
      outstandingAmount: Number(row.outstanding_amount),
      saleId: row.sale_id
    }));
  }

  async create(databaseName: string, input: ReceiptSavePayload & ReceiptTotals) {
    const database = await receiptDatabase(databaseName);
    const uuid = publicId();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          await assertReceiptAllocationsAvailable(transaction, input);
          const lineResult = await sql<{ next_line: number }>`
            SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line FROM billing_receipts
            WHERE company_id = ${input.companyId} AND financial_year_id = ${input.financialYearId}
          `.execute(transaction);
          const insert = await sql`
            INSERT INTO billing_receipts (
              uuid, company_id, financial_year_id, currency_id, line_number, receipt_number,
              receipt_date, customer_id, receipt_mode, ledger_id, reference_no, reference_date,
              amount, tds_amount, discount_amount, round_off, total_amount, allocated_amount,
              unallocated_amount, status, notes
            ) VALUES (
              ${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.currencyId}, ${Number(lineResult.rows[0]?.next_line ?? 1)},
              ${input.receiptNumber}, ${input.receiptDate}, ${input.customerId}, ${input.receiptMode}, ${input.ledgerId},
              ${input.referenceNo || null}, ${input.referenceDate || null}, ${input.amount}, ${input.tdsAmount},
              ${input.discountAmount}, ${input.roundOff}, ${input.totalAmount}, ${input.allocatedAmount},
              ${input.unallocatedAmount}, 'draft', ${input.notes || null}
            )
          `.execute(transaction);
          const receiptId = Number(insert.insertId);
          await replaceAllocations(transaction, receiptId, input.allocations);
          await addActivity(transaction, receiptId, "created", "Receipt created.", null, "draft");
        });
        break;
      } catch (error) {
        if (isDuplicateKey(error, "billing_receipts_line_unique") && attempt < 4) continue;
        if (isDuplicateKey(error, "billing_receipts_number_unique")) {
          throw AppError.conflict("Receipt number is already reserved. Refresh and try again.");
        }
        throw error;
      }
    }
    return this.get(databaseName, uuid);
  }

  async update(databaseName: string, uuid: string, input: ReceiptSavePayload & ReceiptTotals) {
    const database = await receiptDatabase(databaseName);
    const internal = await internalReceipt(database, uuid);
    if (!internal) return null;
    await database.transaction().execute(async (transaction) => {
      await assertReceiptAllocationsAvailable(transaction, input, internal.id);
      await sql`
        UPDATE billing_receipts SET company_id=${input.companyId}, financial_year_id=${input.financialYearId},
          currency_id=${input.currencyId}, receipt_number=${input.receiptNumber}, receipt_date=${input.receiptDate},
          customer_id=${input.customerId}, receipt_mode=${input.receiptMode}, ledger_id=${input.ledgerId},
          reference_no=${input.referenceNo || null}, reference_date=${input.referenceDate || null}, amount=${input.amount},
          tds_amount=${input.tdsAmount}, discount_amount=${input.discountAmount}, round_off=${input.roundOff},
          total_amount=${input.totalAmount}, allocated_amount=${input.allocatedAmount}, unallocated_amount=${input.unallocatedAmount},
          notes=${input.notes || null}
        WHERE id=${internal.id}
      `.execute(transaction);
      await sql`DELETE FROM billing_receipt_allocations WHERE receipt_id=${internal.id}`.execute(
        transaction
      );
      await replaceAllocations(transaction, internal.id, input.allocations);
      await addActivity(transaction, internal.id, "updated", "Receipt updated.", "draft", "draft");
    });
    return this.get(databaseName, uuid);
  }

  async setStatus(databaseName: string, uuid: string, status: ReceiptStatus) {
    const database = await receiptDatabase(databaseName);
    const current = await internalReceipt(database, uuid);
    if (!current) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_receipts SET status=${status},
          posted_at=${status === "posted" ? sql`CURRENT_TIMESTAMP(3)` : sql`posted_at`},
          cancelled_at=${status === "cancelled" ? sql`CURRENT_TIMESTAMP(3)` : sql`cancelled_at`}
        WHERE id=${current.id}
      `.execute(transaction);
      await addActivity(
        transaction,
        current.id,
        status,
        `Receipt ${status}.`,
        current.status,
        status
      );
    });
    return this.get(databaseName, uuid);
  }

  async deleteDraft(databaseName: string, uuid: string) {
    const database = await receiptDatabase(databaseName);
    const current = await internalReceipt(database, uuid);
    if (!current) return null;
    await sql`UPDATE billing_receipts SET deleted_at=CURRENT_TIMESTAMP(3) WHERE id=${current.id}`.execute(
      database
    );
    return this.getIncludingDeleted(database, uuid);
  }

  private async getIncludingDeleted(database: Kysely<ReceiptDatabase>, uuid: string) {
    const result = await selectHeaders(uuid, true).execute(database);
    return result.rows[0] ? this.hydrate(database, result.rows[0]) : null;
  }

  private async hydrate(database: Kysely<ReceiptDatabase>, row: HeaderRow): Promise<Receipt> {
    const result = await sql<{
      allocated_amount: string | number;
      document_date: string;
      document_no: string;
      document_total: string | number;
      previous_balance: string | number;
      sale_id: string;
      uuid: string;
    }>`
      SELECT a.uuid, s.uuid AS sale_id, s.invoice_number AS document_no, s.issued_on AS document_date,
             s.amount AS document_total, s.amount AS previous_balance, a.allocated_amount
      FROM billing_receipt_allocations a INNER JOIN billing_sales s ON s.id=a.sales_id
      WHERE a.receipt_id=${row.id} ORDER BY a.line_number
    `.execute(database);
    const allocations: ReceiptAllocation[] = result.rows.map((item) => ({
      allocatedAmount: Number(item.allocated_amount),
      documentDate: dateValue(item.document_date),
      documentNo: item.document_no,
      documentTotal: Number(item.document_total),
      id: item.uuid,
      previousBalance: Number(item.previous_balance),
      saleId: item.sale_id
    }));
    return {
      allocatedAmount: Number(row.allocated_amount),
      allocations,
      amount: Number(row.amount),
      companyId: row.company_id,
      companyName: row.company_name,
      createdAt: isoValue(row.created_at),
      currencyCode: row.currency_code,
      currencyId: row.currency_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      discountAmount: Number(row.discount_amount),
      financialYearId: row.financial_year_id,
      financialYearName: row.financial_year_name,
      id: row.uuid,
      ledgerId: row.ledger_id,
      ledgerName: row.ledger_name,
      lineNumber: row.line_number,
      notes: row.notes ?? "",
      receiptDate: dateValue(row.receipt_date),
      receiptMode: row.receipt_mode,
      receiptNumber: row.receipt_number,
      referenceDate: row.reference_date ? dateValue(row.reference_date) : "",
      referenceNo: row.reference_no ?? "",
      roundOff: Number(row.round_off),
      status: row.status,
      tdsAmount: Number(row.tds_amount),
      totalAmount: Number(row.total_amount),
      unallocatedAmount: Number(row.unallocated_amount),
      updatedAt: isoValue(row.updated_at)
    };
  }
}

function isDuplicateKey(error: unknown, keyName: string) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "ER_DUP_ENTRY" && candidate.message?.includes(keyName) === true;
}

type ReceiptTotals = { allocatedAmount: number; totalAmount: number; unallocatedAmount: number };

function selectHeaders(
  uuid?: string,
  includeDeleted = false,
  page?: { limit: number; offset: number; search: string; status: string }
) {
  const scope = currentBillingScope();
  return sql<HeaderRow>`
    SELECT r.*, c.name AS company_name, f.name AS financial_year_name, currency.name AS currency_code,
           customer.name AS customer_name, ledger.name AS ledger_name
    FROM billing_receipts r
    INNER JOIN core_companies c ON c.id=r.company_id
    INNER JOIN core_financial_years f ON f.id=r.financial_year_id
    INNER JOIN core_currencies currency ON currency.id=r.currency_id
    INNER JOIN core_contacts customer ON customer.id=r.customer_id
    INNER JOIN core_ledgers ledger ON ledger.id=r.ledger_id
    WHERE ${uuid ? sql`r.uuid=${uuid}` : sql`1=1`}
      AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
      ${includeDeleted ? sql`` : sql`AND r.deleted_at IS NULL`}
      ${
        page
          ? sql`AND (${page.status}='all' OR r.status=${page.status})
        AND (${page.search}='%%' OR r.receipt_number LIKE ${page.search} OR customer.name LIKE ${page.search}
          OR ledger.name LIKE ${page.search} OR r.receipt_mode LIKE ${page.search}
          OR r.status LIKE ${page.search} OR COALESCE(r.reference_no,'') LIKE ${page.search})`
          : sql``
      }
    ORDER BY r.receipt_date DESC, r.line_number DESC
    ${page ? sql`LIMIT ${page.limit} OFFSET ${page.offset}` : sql``}
  `;
}

async function assertReceiptAllocationsAvailable(
  transaction: ReceiptTransaction,
  input: ReceiptSavePayload,
  excludeReceiptId?: number
) {
  const allocations = [...input.allocations].sort((left, right) =>
    left.saleId.localeCompare(right.saleId)
  );
  for (const allocation of allocations) {
    const saleResult = await sql<{ amount: string | number; customer_id: number; id: number }>`
      SELECT id, customer_id, amount FROM billing_sales
      WHERE uuid=${allocation.saleId}
        AND company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
        AND status='confirmed' AND deleted_at IS NULL
      FOR UPDATE
    `.execute(transaction);
    const sale = saleResult.rows[0];
    if (!sale || sale.customer_id !== input.customerId) {
      throw AppError.validation("Receipt allocation sale is no longer available.");
    }
    const allocatedResult = await sql<{ allocated_amount: string | number }>`
      SELECT COALESCE(SUM(a.allocated_amount), 0) AS allocated_amount
      FROM billing_receipt_allocations a
      INNER JOIN billing_receipts r ON r.id=a.receipt_id
      WHERE a.sales_id=${sale.id} AND r.deleted_at IS NULL AND r.status<>'cancelled'
        ${excludeReceiptId ? sql`AND r.id<>${excludeReceiptId}` : sql``}
    `.execute(transaction);
    const outstanding =
      Number(sale.amount) - Number(allocatedResult.rows[0]?.allocated_amount ?? 0);
    if (outstanding + 0.000001 < allocation.allocatedAmount) {
      throw AppError.conflict(
        "Sales outstanding balance changed while this receipt was being saved. Refresh and try again."
      );
    }
  }
}

async function replaceAllocations(
  transaction: ReceiptTransaction,
  receiptId: number,
  allocations: ReceiptSavePayload["allocations"]
) {
  for (const [index, allocation] of allocations.entries()) {
    await sql`
      INSERT INTO billing_receipt_allocations (uuid, receipt_id, sales_id, line_number, allocated_amount)
      SELECT ${publicId()}, ${receiptId}, id, ${index + 1}, ${allocation.allocatedAmount}
      FROM billing_sales WHERE uuid=${allocation.saleId}
        AND company_id=(SELECT company_id FROM billing_receipts WHERE id=${receiptId})
        AND financial_year_id=(SELECT financial_year_id FROM billing_receipts WHERE id=${receiptId})
    `.execute(transaction);
  }
}

async function addActivity(
  transaction: ReceiptTransaction,
  receiptId: number,
  action: string,
  description: string,
  previousStatus: string | null,
  newStatus: string | null
) {
  await sql`INSERT INTO billing_receipt_activities (uuid, receipt_id, action, description, previous_status, new_status)
    VALUES (${publicId()}, ${receiptId}, ${action}, ${description}, ${previousStatus}, ${newStatus})`.execute(
    transaction
  );
}

async function internalReceipt(database: Kysely<ReceiptDatabase>, uuid: string) {
  const scope = currentBillingScope();
  const result = await sql<{
    id: number;
    status: ReceiptStatus;
  }>`SELECT id, status FROM billing_receipts WHERE uuid=${uuid}
    AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    AND deleted_at IS NULL LIMIT 1`.execute(database);
  return result.rows[0] ?? null;
}

function receiptDatabase(databaseName: string) {
  return getBillingDatabase(databaseName) as unknown as Promise<Kysely<ReceiptDatabase>>;
}
function publicId() {
  return randomBytes(4).toString("hex");
}
function dateValue(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function isoValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}
