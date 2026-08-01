import { sql, type Kysely } from "kysely";
import { currentBillingScope } from "../../auth/billing-scope.js";
import {
  QuotationDatabase,
  QuotationHeaderRow,
  QuotationItemRow,
  QuotationReferenceState,
  addressDetails,
  existingIds,
  formatAddress,
  insertActivity,
  insertItems,
  internalQuotation,
  isDuplicateKey,
  money,
  nonNullIds,
  publicUuid,
  quotationDatabase,
  selectQuotationHeaders,
  selectQuotationItems,
  toQuotationItem
} from "./quotation.repository-support.js";
import type {
  Quotation,
  QuotationContext,
  QuotationSavePayload,
  QuotationStatus
} from "./quotation.types.js";

export class QuotationRepository {
  async list(databaseName: string) {
    const database = await quotationDatabase(databaseName);
    const result = await selectQuotationHeaders().execute(database);
    return this.hydrateMany(database, result.rows);
  }

  async listPage(
    databaseName: string,
    options: { customer: string; page: number; pageSize: number; search: string; status: string }
  ) {
    const database = await quotationDatabase(databaseName);
    const search = `%${options.search.trim()}%`;
    const customer = options.customer.trim().toLowerCase();
    const offset = (options.page - 1) * options.pageSize;
    const scope = currentBillingScope();
    const [result, count] = await Promise.all([
      selectQuotationHeaders(undefined, {
        customer,
        limit: options.pageSize,
        offset,
        search,
        status: options.status
      }).execute(database),
      sql<{ total: string | number }>`
        SELECT COUNT(*) AS total FROM billing_quotations s
        INNER JOIN core_contacts customer ON customer.id=s.customer_id
        LEFT JOIN core_work_orders work_order ON work_order.id=s.work_order_id
        WHERE s.deleted_at IS NULL
          AND s.company_id=${scope.companyId}
          AND s.financial_year_id=${scope.financialYearId}
          AND (${options.status}='all' OR s.status=${options.status})
          AND (${customer}='all' OR LOWER(customer.name)=${customer})
          AND (${search}='%%' OR s.quotation_number LIKE ${search} OR customer.name LIKE ${search}
            OR COALESCE(work_order.code,'') LIKE ${search}
            OR DATE_FORMAT(s.quotation_date,'%Y-%m-%d') LIKE ${search}
            OR s.status LIKE ${search} OR CAST(s.amount AS CHAR) LIKE ${search})
      `.execute(database)
    ]);
    return {
      items: await this.hydrateMany(database, result.rows),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(count.rows[0]?.total ?? 0)
    };
  }

  async get(databaseName: string, uuid: string) {
    const database = await quotationDatabase(databaseName);
    const result = await selectQuotationHeaders(uuid).execute(database);
    const row = result.rows[0];
    return row ? this.hydrate(database, row) : null;
  }

  async context(databaseName: string): Promise<QuotationContext | null> {
    const database = await quotationDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<{
      company_id: number;
      company_name: string;
      currency_code: string;
      currency_id: number;
      financial_year_id: number;
      financial_year_name: string;
    }>`
      SELECT c.id AS company_id,
             c.name AS company_name,
             f.id AS financial_year_id,
             f.name AS financial_year_name,
             currency.id AS currency_id,
             currency.name AS currency_code
      FROM core_companies c
      CROSS JOIN core_financial_years f
      INNER JOIN core_currencies currency ON UPPER(currency.name) = 'INR' AND currency.status = 'active'
      WHERE c.id=${scope.companyId} AND c.status='active'
        AND f.id=${scope.financialYearId} AND f.status='active'
      LIMIT 1
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

  async referenceState(
    databaseName: string,
    input: QuotationSavePayload
  ): Promise<QuotationReferenceState> {
    const database = await quotationDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<Record<keyof QuotationReferenceState, number>>`
      SELECT
        EXISTS(SELECT 1 FROM core_companies WHERE id = ${input.companyId} AND id=${scope.companyId} AND status = 'active') AS company,
        EXISTS(SELECT 1 FROM core_financial_years WHERE id = ${input.financialYearId} AND id=${scope.financialYearId} AND status = 'active' AND ${input.date} BETWEEN start_date AND end_date) AS financialYear,
        EXISTS(SELECT 1 FROM core_contacts WHERE id = ${input.customerId} AND status = 'active') AS customer,
        EXISTS(SELECT 1 FROM core_contacts_addresses WHERE id = ${input.billingAddressId} AND parent_id = ${input.customerId}) AS billingAddress,
        EXISTS(SELECT 1 FROM core_contacts_addresses WHERE id = ${input.shippingAddressId} AND parent_id = ${input.customerId}) AS shippingAddress,
        ${input.workOrderId ? sql`EXISTS(SELECT 1 FROM core_work_orders WHERE id = ${input.workOrderId} AND status = 'active')` : sql`1`} AS workOrder,
        ${input.ledgerId ? sql`EXISTS(SELECT 1 FROM core_ledgers WHERE id = ${input.ledgerId} AND status = 'active')` : sql`1`} AS ledger,
        EXISTS(SELECT 1 FROM core_currencies WHERE id = ${input.currencyId} AND status = 'active') AS currency
    `.execute(database);
    const row = result.rows[0];
    return {
      billingAddress: Boolean(row?.billingAddress),
      company: Boolean(row?.company),
      currency: Boolean(row?.currency),
      customer: Boolean(row?.customer),
      financialYear: Boolean(row?.financialYear),
      ledger: Boolean(row?.ledger),
      shippingAddress: Boolean(row?.shippingAddress),
      workOrder: Boolean(row?.workOrder)
    };
  }

  async resolveMissingReferences(
    databaseName: string,
    input: QuotationSavePayload
  ): Promise<QuotationSavePayload> {
    const database = await quotationDatabase(databaseName);
    const context = await this.context(databaseName);
    const contactResult =
      input.customerId > 0
        ? null
        : await sql<{ id: number }>`
            SELECT id FROM core_contacts
            WHERE LOWER(name) = LOWER(${input.customerName}) AND status = 'active'
            LIMIT 1
          `.execute(database);
    const customerId = input.customerId || Number(contactResult?.rows[0]?.id ?? 0);
    const addressResult =
      customerId > 0 && (!input.billingAddressId || !input.shippingAddressId)
        ? await sql<{ id: number }>`
            SELECT id FROM core_contacts_addresses
            WHERE parent_id = ${customerId}
            ORDER BY is_default DESC, sort_order, id
          `.execute(database)
        : null;
    const addressIds = addressResult?.rows.map((row) => Number(row.id)) ?? [];
    const workOrderResult = !input.workOrderId
      ? await sql<{ id: number }>`
            SELECT id FROM core_work_orders
            WHERE status = 'active'
            ORDER BY CASE WHEN code=${input.workOrderNo} AND ${input.workOrderNo}<>'' THEN 0
              WHEN TRIM(code)='-' THEN 1 ELSE 2 END,id LIMIT 1
          `.execute(database)
      : null;
    const ledgerResult = !input.ledgerId
      ? await sql<{ id: number }>`
            SELECT id FROM core_ledgers
            WHERE status = 'active'
            ORDER BY CASE WHEN LOWER(name)=LOWER(${input.salesLedger}) AND ${input.salesLedger}<>'' THEN 0
              WHEN TRIM(name)='-' THEN 1 ELSE 2 END,id LIMIT 1
          `.execute(database)
      : null;

    const items: QuotationSavePayload["items"] = [];
    for (const item of input.items) {
      const product =
        item.productId || item.productName
          ? await sql<{
              id: number;
              hsn_code_id: number | null;
              tax_id: number | null;
              unit_id: number | null;
            }>`
              SELECT id, hsn_code_id, gst_tax_id AS tax_id, unit_id FROM core_products
              WHERE (${item.productId || 0} > 0 AND id=${item.productId || 0}
                OR ${item.productId || 0}=0 AND LOWER(name)=LOWER(${item.productName}))
                AND status = 'active' AND deleted_at IS NULL
              LIMIT 1
            `.execute(database)
          : null;
      const hsn =
        !item.hsnCodeId && item.hsnCode
          ? await sql<{
              id: number;
            }>`SELECT id FROM core_hsn_codes WHERE code = ${item.hsnCode} AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const colour =
        !item.colourId && item.colour
          ? await sql<{
              id: number;
            }>`SELECT id FROM core_colours WHERE LOWER(name) = LOWER(${item.colour}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const size =
        !item.sizeId && item.size
          ? await sql<{
              id: number;
            }>`SELECT id FROM core_sizes WHERE LOWER(name) = LOWER(${item.size}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const unit =
        !item.unitId && item.unit
          ? await sql<{
              id: number;
            }>`SELECT id FROM core_units WHERE LOWER(name) = LOWER(${item.unit}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const tax = !item.taxId
        ? await sql<{
            id: number;
          }>`SELECT id FROM core_taxes WHERE rate_percent = ${item.taxRate} AND status = 'active' LIMIT 1`.execute(
            database
          )
        : null;
      const productRow = product?.rows[0];
      items.push({
        ...item,
        colourId: item.colourId ?? colour?.rows[0]?.id ?? null,
        hsnCodeId: item.hsnCodeId ?? productRow?.hsn_code_id ?? hsn?.rows[0]?.id ?? null,
        productId: item.productId ?? productRow?.id ?? null,
        sizeId: item.sizeId ?? size?.rows[0]?.id ?? null,
        taxId: item.taxId ?? productRow?.tax_id ?? tax?.rows[0]?.id ?? null,
        unitId: item.unitId || productRow?.unit_id || unit?.rows[0]?.id || 0
      });
    }

    return {
      ...input,
      billingAddressId: input.billingAddressId || addressIds[0] || 0,
      companyId: input.companyId || context?.companyId || 0,
      currencyCode: input.currencyCode || context?.currencyCode || "INR",
      currencyId: input.currencyId || context?.currencyId || 0,
      customerId,
      financialYearId: input.financialYearId || context?.financialYearId || 0,
      items,
      ledgerId: input.ledgerId ?? ledgerResult?.rows[0]?.id ?? null,
      shippingAddressId: input.shippingAddressId || addressIds[1] || addressIds[0] || 0,
      workOrderId: input.workOrderId ?? workOrderResult?.rows[0]?.id ?? null
    };
  }

  async validItemReferenceIds(databaseName: string, input: QuotationSavePayload) {
    const database = await quotationDatabase(databaseName);
    return {
      colours: await existingIds(
        database,
        sql`SELECT id FROM core_colours WHERE status = 'active'`
      ),
      hsnCodes: await existingIds(
        database,
        sql`SELECT id FROM core_hsn_codes WHERE status = 'active'`
      ),
      products: await existingIds(
        database,
        sql`SELECT id FROM core_products WHERE status = 'active' AND deleted_at IS NULL`
      ),
      sizes: await existingIds(database, sql`SELECT id FROM core_sizes WHERE status = 'active'`),
      taxes: await existingIds(database, sql`SELECT id FROM core_taxes WHERE status = 'active'`),
      units: await existingIds(database, sql`SELECT id FROM core_units WHERE status = 'active'`),
      requested: {
        colours: nonNullIds(input.items.map((item) => item.colourId)),
        hsnCodes: nonNullIds(input.items.map((item) => item.hsnCodeId)),
        products: nonNullIds(input.items.map((item) => item.productId)),
        sizes: nonNullIds(input.items.map((item) => item.sizeId)),
        taxes: nonNullIds(input.items.map((item) => item.taxId)),
        units: nonNullIds(input.items.map((item) => item.unitId))
      }
    };
  }

  async findByQuotationNumber(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    quotationNumber: string
  ) {
    const database = await quotationDatabase(databaseName);
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM billing_quotations
      WHERE company_id = ${companyId}
        AND financial_year_id = ${financialYearId}
        AND quotation_number = ${quotationNumber}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async create(
    databaseName: string,
    input: QuotationSavePayload,
    totals: Pick<Quotation, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await quotationDatabase(databaseName);
    const uuid = publicUuid();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          const lineResult = await sql<{ line_number: number }>`
        SELECT COALESCE(MAX(line_number), 0) + 1 AS line_number
        FROM billing_quotations
        WHERE company_id = ${input.companyId} AND financial_year_id = ${input.financialYearId}
      `.execute(transaction);
          const lineNumber = Number(lineResult.rows[0]?.line_number ?? 1);
          const inserted = await sql`
        INSERT INTO billing_quotations (
          uuid, company_id, financial_year_id, line_number, quotation_number, customer_id,
          billing_address_id, shipping_address_id, work_order_id, ledger_id, tax_type,
          currency_id, quotation_date, subtotal, tax_amount, round_off, amount, terms, notes, status
        ) VALUES (
          ${uuid}, ${input.companyId}, ${input.financialYearId}, ${lineNumber}, ${input.quotationNumber},
          ${input.customerId}, ${input.billingAddressId}, ${input.shippingAddressId},
          ${input.workOrderId}, ${input.ledgerId}, ${input.taxType ?? "cgst-sgst"},
          ${input.currencyId}, ${input.date}, ${totals.subtotal}, ${totals.taxAmount},
          ${input.roundOff ?? 0}, ${totals.amount}, ${input.terms ?? ""}, ${input.notes}, ${input.status}
        )
      `.execute(transaction);
          const quotationId = Number(inserted.insertId);
          await insertItems(transaction, quotationId, totals.items);
          await insertActivity(transaction, quotationId, "created", "create", null, input.status);
        });
        break;
      } catch (error) {
        if (isDuplicateKey(error, "billing_quotations_line_unique") && attempt < 4) continue;
        throw error;
      }
    }
    return this.get(databaseName, uuid);
  }

  async update(
    databaseName: string,
    uuid: string,
    input: QuotationSavePayload,
    totals: Pick<Quotation, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await quotationDatabase(databaseName);
    const existing = await internalQuotation(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_quotations SET
          company_id = ${input.companyId}, financial_year_id = ${input.financialYearId},
          quotation_number = ${input.quotationNumber}, customer_id = ${input.customerId},
          billing_address_id = ${input.billingAddressId}, shipping_address_id = ${input.shippingAddressId},
          work_order_id = ${input.workOrderId}, ledger_id = ${input.ledgerId},
          tax_type = ${input.taxType ?? "cgst-sgst"}, currency_id = ${input.currencyId},
          quotation_date = ${input.date}, subtotal = ${totals.subtotal}, tax_amount = ${totals.taxAmount},
          round_off = ${input.roundOff ?? 0}, amount = ${totals.amount}, terms = ${input.terms ?? ""},
          notes = ${input.notes}, status = ${input.status}, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
      await sql`DELETE FROM billing_quotation_items WHERE quotation_id = ${existing.id}`.execute(
        transaction
      );
      await insertItems(transaction, existing.id, totals.items);
      await insertActivity(
        transaction,
        existing.id,
        "updated",
        "update",
        existing.status,
        input.status
      );
    });
    return this.get(databaseName, uuid);
  }

  async setStatus(databaseName: string, uuid: string, status: QuotationStatus) {
    const database = await quotationDatabase(databaseName);
    const existing = await internalQuotation(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_quotations SET status = ${status},
          confirmed_at = ${status === "confirmed" ? sql`CURRENT_TIMESTAMP(3)` : null},
          cancelled_at = ${status === "cancelled" ? sql`CURRENT_TIMESTAMP(3)` : null},
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
      await insertActivity(transaction, existing.id, status, "status", existing.status, status);
    });
    return this.get(databaseName, uuid);
  }

  async setGeneratedSalesInvoice(databaseName: string, uuid: string, invoiceNumber: string) {
    const database = await quotationDatabase(databaseName);
    const existing = await internalQuotation(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_quotations
        SET generated_sales_invoice_no = ${invoiceNumber}, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
      await insertActivity(
        transaction,
        existing.id,
        "converted",
        "convert-to-sale",
        existing.status,
        existing.status
      );
    });
    return this.get(databaseName, uuid);
  }

  async softDelete(databaseName: string, uuid: string) {
    const database = await quotationDatabase(databaseName);
    const existing = await internalQuotation(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await insertActivity(
        transaction,
        existing.id,
        "deleted",
        "soft-delete",
        existing.status,
        null
      );
      await sql`
        UPDATE billing_quotations SET deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
    });
    return { uuid };
  }

  private async hydrate(
    database: Kysely<QuotationDatabase>,
    row: QuotationHeaderRow
  ): Promise<Quotation> {
    return (await this.hydrateMany(database, [row]))[0]!;
  }

  private async hydrateMany(
    database: Kysely<QuotationDatabase>,
    rows: QuotationHeaderRow[]
  ): Promise<Quotation[]> {
    if (rows.length === 0) return [];
    const itemsResult = await selectQuotationItems(rows.map((row) => row.id)).execute(database);
    const itemsByQuotation = new Map<number, QuotationItemRow[]>();
    for (const item of itemsResult.rows) {
      const items = itemsByQuotation.get(item.quotation_id) ?? [];
      items.push(item);
      itemsByQuotation.set(item.quotation_id, items);
    }
    return rows.map((row) => this.toQuotation(row, itemsByQuotation.get(row.id) ?? []));
  }

  private toQuotation(row: QuotationHeaderRow, items: QuotationItemRow[]): Quotation {
    return {
      amount: money(row.amount),
      billingAddress: formatAddress(row, "billing"),
      billingAddressDetails: addressDetails(row, "billing"),
      billingAddressId: row.billing_address_id,
      billingStateCode: row.billing_state_code ?? "",
      billingStateName: row.billing_state ?? "",
      companyId: row.company_id,
      companyName: row.company_name,
      createdAt: row.created_at,
      currencyCode: row.currency_code,
      currencyId: row.currency_id,
      customerEmail: row.customer_email ?? "",
      customerGstin: row.customer_gstin ?? "",
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone ?? "",
      financialYearId: row.financial_year_id,
      financialYearName: row.financial_year_name,
      generatedSalesInvoiceNo: row.generated_sales_invoice_no ?? "",
      id: row.uuid,
      quotationNumber: row.quotation_number,
      date: row.quotation_date,
      items: items.map(toQuotationItem),
      ledgerId: row.ledger_id,
      lineNumber: row.line_number,
      notes: row.notes ?? "",
      roundOff: money(row.round_off),
      salesLedger: row.ledger_name ?? "",
      shippingAddress: formatAddress(row, "shipping"),
      shippingAddressDetails: addressDetails(row, "shipping"),
      shippingAddressId: row.shipping_address_id,
      shippingStateCode: row.shipping_state_code ?? "",
      shippingStateName: row.shipping_state ?? "",
      status: row.status,
      subtotal: money(row.subtotal),
      taxAmount: money(row.tax_amount),
      taxType: row.tax_type,
      terms: row.terms ?? "",
      updatedAt: row.updated_at,
      workOrderId: row.work_order_id,
      workOrderNo: row.work_order_no ?? ""
    };
  }
}
