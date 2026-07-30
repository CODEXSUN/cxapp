import { randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { AppError } from "@codexsun/framework/errors";
import { getBillingDatabase } from "../../database/billing-database.js";
import { currentBillingScope } from "../../auth/billing-scope.js";
import type {
  Payment,
  PaymentActivity,
  PaymentAllocation,
  PaymentAllocationCandidate,
  PaymentContext,
  PaymentSavePayload,
  PaymentStatus
} from "./payment.types.js";

type PaymentDatabase = Record<string, never>;
type PaymentTransaction = Transaction<PaymentDatabase>;
type HeaderRow = {
  allocated_amount: string | number;
  amount: string | number;
  company_id: number;
  company_name: string;
  created_at: string;
  currency_code: string;
  currency_id: number;
  supplier_id: number;
  supplier_name: string;
  discount_amount: string | number;
  financial_year_id: number;
  financial_year_name: string;
  id: number;
  ledger_id: number;
  ledger_name: string;
  line_number: number;
  notes: string | null;
  payment_date: string;
  payment_mode: Payment["paymentMode"];
  payment_number: string;
  reference_date: string | null;
  reference_no: string | null;
  round_off: string | number;
  status: PaymentStatus;
  tds_amount: string | number;
  total_amount: string | number;
  unallocated_amount: string | number;
  updated_at: string;
  uuid: string;
};

export class PaymentRepository {
  async defaultLedgerId(databaseName: string) {
    const database = await paymentDatabase(databaseName);
    const result = await sql<{ id: number }>`SELECT id FROM ledgers WHERE status='active'
      ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1`.execute(database);
    return Number(result.rows[0]?.id ?? 0);
  }

  async list(databaseName: string) {
    const database = await paymentDatabase(databaseName);
    const result = await selectHeaders().execute(database);
    return Promise.all(result.rows.map((row) => this.hydrate(database, row)));
  }
  async listPage(
    databaseName: string,
    options: { page: number; pageSize: number; search: string; status: string }
  ) {
    const database = await paymentDatabase(databaseName);
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
    }>`SELECT COUNT(*) AS total FROM billing_payments r
      INNER JOIN contacts supplier ON supplier.id=r.supplier_id INNER JOIN ledgers ledger ON ledger.id=r.ledger_id
      WHERE r.deleted_at IS NULL
      AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
      AND (${page.status}='all' OR r.status=${page.status})
      AND (${search}='%%' OR r.payment_number LIKE ${search} OR supplier.name LIKE ${search}
        OR ledger.name LIKE ${search} OR r.payment_mode LIKE ${search} OR r.status LIKE ${search}
        OR COALESCE(r.reference_no,'') LIKE ${search})`.execute(database);
    return {
      items: await Promise.all(result.rows.map((row) => this.hydrate(database, row))),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(count.rows[0]?.total ?? 0)
    };
  }

  async get(databaseName: string, uuid: string) {
    const database = await paymentDatabase(databaseName);
    const result = await selectHeaders(uuid).execute(database);
    const row = result.rows[0];
    return row ? this.hydrate(database, row) : null;
  }

  async activity(databaseName: string, uuid: string): Promise<PaymentActivity[] | null> {
    const database = await paymentDatabase(databaseName);
    const payment = await internalPayment(database, uuid);
    if (!payment) return null;
    const result = await sql<{
      action: string;
      created_at: string;
      description: string;
      new_status: PaymentStatus | null;
      previous_status: PaymentStatus | null;
      uuid: string;
    }>`
      SELECT uuid, action, description, previous_status, new_status, created_at
      FROM billing_payment_activities
      WHERE payment_id = ${payment.id}
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
  ): Promise<Omit<PaymentContext, "suggestedPaymentNumber"> | null> {
    const database = await paymentDatabase(databaseName);
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
      FROM companies c
      CROSS JOIN financial_years f
      INNER JOIN currencies currency ON UPPER(currency.name) = 'INR' AND currency.status = 'active'
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
    const database = await paymentDatabase(databaseName);
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM billing_payments
      WHERE company_id = ${companyId} AND financial_year_id = ${financialYearId}
        AND payment_number = ${number} AND deleted_at IS NULL
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async validateReferences(databaseName: string, input: PaymentSavePayload, excludeUuid?: string) {
    const database = await paymentDatabase(databaseName);
    const scope = currentBillingScope();
    const base = await sql<{
      company: number;
      currency: number;
      supplier: number;
      financialYear: number;
      ledger: number;
    }>`
      SELECT
        EXISTS(SELECT 1 FROM companies WHERE id = ${input.companyId} AND id=${scope.companyId} AND status = 'active') AS company,
        EXISTS(SELECT 1 FROM financial_years WHERE id = ${input.financialYearId} AND id=${scope.financialYearId} AND status = 'active' AND ${input.paymentDate} BETWEEN start_date AND end_date) AS financialYear,
        EXISTS(SELECT 1 FROM currencies WHERE id = ${input.currencyId} AND status = 'active') AS currency,
        EXISTS(SELECT 1 FROM contacts WHERE id = ${input.supplierId} AND status = 'active') AS supplier,
        EXISTS(SELECT 1 FROM ledgers WHERE id = ${input.ledgerId} AND status = 'active') AS ledger
    `.execute(database);
    const allocations = await Promise.all(
      input.allocations.map(async (allocation) => {
        const result = await sql<{ supplier_id: number; outstanding_amount: string | number }>`
        SELECT s.supplier_id,
          GREATEST(s.amount - COALESCE(SUM(CASE WHEN r.status <> 'cancelled' ${excludeUuid ? sql`AND r.uuid <> ${excludeUuid}` : sql``} THEN a.allocated_amount ELSE 0 END), 0), 0) AS outstanding_amount
        FROM billing_purchases s
        LEFT JOIN billing_payment_allocations a ON a.purchase_id = s.id
        LEFT JOIN billing_payments r ON r.id = a.payment_id
          AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
          AND r.deleted_at IS NULL
        WHERE s.uuid = ${allocation.purchaseId}
          AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
          AND s.status = 'confirmed' AND s.deleted_at IS NULL
        GROUP BY s.id, s.supplier_id, s.amount
      `.execute(database);
        const row = result.rows[0];
        return Boolean(
          row &&
          row.supplier_id === input.supplierId &&
          Number(row.outstanding_amount) >= allocation.allocatedAmount
        );
      })
    );
    const row = base.rows[0];
    return {
      company: Boolean(row?.company),
      currency: Boolean(row?.currency),
      supplier: Boolean(row?.supplier),
      financialYear: Boolean(row?.financialYear),
      ledger: Boolean(row?.ledger),
      allocations: allocations.every(Boolean)
    };
  }

  async allocationCandidates(
    databaseName: string,
    supplierId: number
  ): Promise<PaymentAllocationCandidate[]> {
    const database = await paymentDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<{
      supplier_id: number;
      document_date: string;
      document_no: string;
      document_total: string | number;
      outstanding_amount: string | number;
      purchase_id: string;
    }>`
      SELECT s.uuid AS purchase_id, s.supplier_id, s.purchase_number AS document_no,
             s.purchase_date AS document_date, s.amount AS document_total,
             GREATEST(s.amount - COALESCE(SUM(CASE WHEN r.status <> 'cancelled' THEN a.allocated_amount ELSE 0 END), 0), 0) AS outstanding_amount
      FROM billing_purchases s
      LEFT JOIN billing_payment_allocations a ON a.purchase_id = s.id
      LEFT JOIN billing_payments r ON r.id = a.payment_id
        AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
        AND r.deleted_at IS NULL
      WHERE s.supplier_id = ${supplierId}
        AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
        AND s.status = 'confirmed' AND s.deleted_at IS NULL
      GROUP BY s.id, s.uuid, s.supplier_id, s.purchase_number, s.purchase_date, s.amount
      HAVING outstanding_amount > 0
      ORDER BY s.purchase_date, s.line_number
    `.execute(database);
    return result.rows.map((row) => ({
      supplierId: row.supplier_id,
      documentDate: dateValue(row.document_date),
      documentNo: row.document_no,
      documentTotal: Number(row.document_total),
      outstandingAmount: Number(row.outstanding_amount),
      purchaseId: row.purchase_id
    }));
  }

  async create(databaseName: string, input: PaymentSavePayload & PaymentTotals) {
    const database = await paymentDatabase(databaseName);
    const uuid = publicId();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          await assertPaymentAllocationsAvailable(transaction, input);
          const lineResult = await sql<{ next_line: number }>`
            SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line FROM billing_payments
            WHERE company_id = ${input.companyId} AND financial_year_id = ${input.financialYearId}
          `.execute(transaction);
          const insert = await sql`
            INSERT INTO billing_payments (
              uuid, company_id, financial_year_id, currency_id, line_number, payment_number,
              payment_date, supplier_id, payment_mode, ledger_id, reference_no, reference_date,
              amount, tds_amount, discount_amount, round_off, total_amount, allocated_amount,
              unallocated_amount, status, notes
            ) VALUES (
              ${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.currencyId}, ${Number(lineResult.rows[0]?.next_line ?? 1)},
              ${input.paymentNumber}, ${input.paymentDate}, ${input.supplierId}, ${input.paymentMode}, ${input.ledgerId},
              ${input.referenceNo || null}, ${input.referenceDate || null}, ${input.amount}, ${input.tdsAmount},
              ${input.discountAmount}, ${input.roundOff}, ${input.totalAmount}, ${input.allocatedAmount},
              ${input.unallocatedAmount}, 'draft', ${input.notes || null}
            )
          `.execute(transaction);
          const paymentId = Number(insert.insertId);
          await replaceAllocations(transaction, paymentId, input.allocations);
          await addActivity(transaction, paymentId, "created", "Payment created.", null, "draft");
        });
        break;
      } catch (error) {
        if (isDuplicateKey(error, "billing_payments_line_unique") && attempt < 4) continue;
        if (isDuplicateKey(error, "billing_payments_number_unique")) {
          throw AppError.conflict("Payment number is already reserved. Refresh and try again.");
        }
        throw error;
      }
    }
    return this.get(databaseName, uuid);
  }

  async update(databaseName: string, uuid: string, input: PaymentSavePayload & PaymentTotals) {
    const database = await paymentDatabase(databaseName);
    const internal = await internalPayment(database, uuid);
    if (!internal) return null;
    await database.transaction().execute(async (transaction) => {
      await assertPaymentAllocationsAvailable(transaction, input, internal.id);
      await sql`
        UPDATE billing_payments SET company_id=${input.companyId}, financial_year_id=${input.financialYearId},
          currency_id=${input.currencyId}, payment_number=${input.paymentNumber}, payment_date=${input.paymentDate},
          supplier_id=${input.supplierId}, payment_mode=${input.paymentMode}, ledger_id=${input.ledgerId},
          reference_no=${input.referenceNo || null}, reference_date=${input.referenceDate || null}, amount=${input.amount},
          tds_amount=${input.tdsAmount}, discount_amount=${input.discountAmount}, round_off=${input.roundOff},
          total_amount=${input.totalAmount}, allocated_amount=${input.allocatedAmount}, unallocated_amount=${input.unallocatedAmount},
          notes=${input.notes || null}
        WHERE id=${internal.id}
      `.execute(transaction);
      await sql`DELETE FROM billing_payment_allocations WHERE payment_id=${internal.id}`.execute(
        transaction
      );
      await replaceAllocations(transaction, internal.id, input.allocations);
      await addActivity(transaction, internal.id, "updated", "Payment updated.", "draft", "draft");
    });
    return this.get(databaseName, uuid);
  }

  async setStatus(databaseName: string, uuid: string, status: PaymentStatus) {
    const database = await paymentDatabase(databaseName);
    const current = await internalPayment(database, uuid);
    if (!current) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_payments SET status=${status},
          posted_at=${status === "posted" ? sql`CURRENT_TIMESTAMP(3)` : sql`posted_at`},
          cancelled_at=${status === "cancelled" ? sql`CURRENT_TIMESTAMP(3)` : sql`cancelled_at`}
        WHERE id=${current.id}
      `.execute(transaction);
      await addActivity(
        transaction,
        current.id,
        status,
        `Payment ${status}.`,
        current.status,
        status
      );
    });
    return this.get(databaseName, uuid);
  }

  async deleteDraft(databaseName: string, uuid: string) {
    const database = await paymentDatabase(databaseName);
    const current = await internalPayment(database, uuid);
    if (!current) return null;
    await sql`UPDATE billing_payments SET deleted_at=CURRENT_TIMESTAMP(3) WHERE id=${current.id}`.execute(
      database
    );
    return this.getIncludingDeleted(database, uuid);
  }

  private async getIncludingDeleted(database: Kysely<PaymentDatabase>, uuid: string) {
    const result = await selectHeaders(uuid, true).execute(database);
    return result.rows[0] ? this.hydrate(database, result.rows[0]) : null;
  }

  private async hydrate(database: Kysely<PaymentDatabase>, row: HeaderRow): Promise<Payment> {
    const result = await sql<{
      allocated_amount: string | number;
      document_date: string;
      document_no: string;
      document_total: string | number;
      previous_balance: string | number;
      purchase_id: string;
      uuid: string;
    }>`
      SELECT a.uuid, s.uuid AS purchase_id, s.purchase_number AS document_no, s.purchase_date AS document_date,
             s.amount AS document_total, s.amount AS previous_balance, a.allocated_amount
      FROM billing_payment_allocations a INNER JOIN billing_purchases s ON s.id=a.purchase_id
      WHERE a.payment_id=${row.id} ORDER BY a.line_number
    `.execute(database);
    const allocations: PaymentAllocation[] = result.rows.map((item) => ({
      allocatedAmount: Number(item.allocated_amount),
      documentDate: dateValue(item.document_date),
      documentNo: item.document_no,
      documentTotal: Number(item.document_total),
      id: item.uuid,
      previousBalance: Number(item.previous_balance),
      purchaseId: item.purchase_id
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
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      discountAmount: Number(row.discount_amount),
      financialYearId: row.financial_year_id,
      financialYearName: row.financial_year_name,
      id: row.uuid,
      ledgerId: row.ledger_id,
      ledgerName: row.ledger_name,
      lineNumber: row.line_number,
      notes: row.notes ?? "",
      paymentDate: dateValue(row.payment_date),
      paymentMode: row.payment_mode,
      paymentNumber: row.payment_number,
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

type PaymentTotals = { allocatedAmount: number; totalAmount: number; unallocatedAmount: number };

function selectHeaders(
  uuid?: string,
  includeDeleted = false,
  page?: { limit: number; offset: number; search: string; status: string }
) {
  const scope = currentBillingScope();
  return sql<HeaderRow>`
    SELECT r.*, c.name AS company_name, f.name AS financial_year_name, currency.name AS currency_code,
           supplier.name AS supplier_name, ledger.name AS ledger_name
    FROM billing_payments r
    INNER JOIN companies c ON c.id=r.company_id
    INNER JOIN financial_years f ON f.id=r.financial_year_id
    INNER JOIN currencies currency ON currency.id=r.currency_id
    INNER JOIN contacts supplier ON supplier.id=r.supplier_id
    INNER JOIN ledgers ledger ON ledger.id=r.ledger_id
    WHERE ${uuid ? sql`r.uuid=${uuid}` : sql`1=1`}
      AND r.company_id=${scope.companyId} AND r.financial_year_id=${scope.financialYearId}
      ${includeDeleted ? sql`` : sql`AND r.deleted_at IS NULL`}
      ${
        page
          ? sql`AND (${page.status}='all' OR r.status=${page.status})
        AND (${page.search}='%%' OR r.payment_number LIKE ${page.search} OR supplier.name LIKE ${page.search}
          OR ledger.name LIKE ${page.search} OR r.payment_mode LIKE ${page.search}
          OR r.status LIKE ${page.search} OR COALESCE(r.reference_no,'') LIKE ${page.search})`
          : sql``
      }
    ORDER BY r.payment_date DESC, r.line_number DESC
    ${page ? sql`LIMIT ${page.limit} OFFSET ${page.offset}` : sql``}
  `;
}

async function assertPaymentAllocationsAvailable(
  transaction: PaymentTransaction,
  input: PaymentSavePayload,
  excludePaymentId?: number
) {
  const allocations = [...input.allocations].sort((left, right) =>
    left.purchaseId.localeCompare(right.purchaseId)
  );
  for (const allocation of allocations) {
    const purchaseResult = await sql<{ amount: string | number; id: number; supplier_id: number }>`
      SELECT id, supplier_id, amount FROM billing_purchases
      WHERE uuid=${allocation.purchaseId}
        AND company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
        AND status='confirmed' AND deleted_at IS NULL
      FOR UPDATE
    `.execute(transaction);
    const purchase = purchaseResult.rows[0];
    if (!purchase || purchase.supplier_id !== input.supplierId) {
      throw AppError.validation("Payment allocation purchase is no longer available.");
    }
    const allocatedResult = await sql<{ allocated_amount: string | number }>`
      SELECT COALESCE(SUM(a.allocated_amount), 0) AS allocated_amount
      FROM billing_payment_allocations a
      INNER JOIN billing_payments p ON p.id=a.payment_id
      WHERE a.purchase_id=${purchase.id} AND p.deleted_at IS NULL AND p.status<>'cancelled'
        ${excludePaymentId ? sql`AND p.id<>${excludePaymentId}` : sql``}
    `.execute(transaction);
    const outstanding =
      Number(purchase.amount) - Number(allocatedResult.rows[0]?.allocated_amount ?? 0);
    if (outstanding + 0.000001 < allocation.allocatedAmount) {
      throw AppError.conflict(
        "Purchase outstanding balance changed while this payment was being saved. Refresh and try again."
      );
    }
  }
}

async function replaceAllocations(
  transaction: PaymentTransaction,
  paymentId: number,
  allocations: PaymentSavePayload["allocations"]
) {
  for (const [index, allocation] of allocations.entries()) {
    await sql`
      INSERT INTO billing_payment_allocations (uuid, payment_id, purchase_id, line_number, allocated_amount)
      SELECT ${publicId()}, ${paymentId}, id, ${index + 1}, ${allocation.allocatedAmount}
      FROM billing_purchases WHERE uuid=${allocation.purchaseId}
        AND company_id=(SELECT company_id FROM billing_payments WHERE id=${paymentId})
        AND financial_year_id=(SELECT financial_year_id FROM billing_payments WHERE id=${paymentId})
    `.execute(transaction);
  }
}

async function addActivity(
  transaction: PaymentTransaction,
  paymentId: number,
  action: string,
  description: string,
  previousStatus: string | null,
  newStatus: string | null
) {
  await sql`INSERT INTO billing_payment_activities (uuid, payment_id, action, description, previous_status, new_status)
    VALUES (${publicId()}, ${paymentId}, ${action}, ${description}, ${previousStatus}, ${newStatus})`.execute(
    transaction
  );
}

async function internalPayment(database: Kysely<PaymentDatabase>, uuid: string) {
  const scope = currentBillingScope();
  const result = await sql<{
    id: number;
    status: PaymentStatus;
  }>`SELECT id, status FROM billing_payments WHERE uuid=${uuid}
    AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    AND deleted_at IS NULL LIMIT 1`.execute(
    database
  );
  return result.rows[0] ?? null;
}

function paymentDatabase(databaseName: string) {
  return getBillingDatabase(databaseName) as unknown as Promise<Kysely<PaymentDatabase>>;
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
