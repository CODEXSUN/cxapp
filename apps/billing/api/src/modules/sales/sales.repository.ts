import { sql, type Kysely } from "kysely";
import { currentBillingScope } from "../../auth/billing-scope.js";
import {
  defaultEinvoice,
  defaultEway,
  existingIds,
  formatAddress,
  insertActivity,
  insertItems,
  internalSale,
  isDuplicateKey,
  money,
  nonNullIds,
  publicUuid,
  SaleHeaderRow,
  SaleItemRow,
  SaleReferenceState,
  SalesDatabase,
  salesDatabase,
  SalesInvoiceReservationConflict,
  selectSaleHeaders,
  selectSaleItems,
  selectSalePageHeaders,
  toSaleItem,
  upsertEinvoice,
  upsertEway
} from "./sales.repository-support.js";
import type {
  Sale,
  SaleContext,
  SaleEinvoiceDetails,
  SaleEwayDetails,
  SaleSavePayload,
  SaleStatus
} from "./sales.types.js";
export { SalesInvoiceReservationConflict } from "./sales.repository-support.js";

type SaleEinvoiceRow = {
  ack_date: string | null;
  ack_number: string | null;
  irn: string;
  sales_id: number;
  signed_qr: string | null;
  status: "not-generated" | "generated";
};

type SaleEwayRow = {
  bill_date: string;
  bill_number: string;
  notes: string | null;
  part: "Part A" | "Part B";
  sales_id: number;
  status: "not-generated" | "generated";
  transport_gst: string | null;
  transport_id: number | null;
  transport_name: string | null;
  vehicle_number: string | null;
};

export class SalesRepository {
  async list(databaseName: string) {
    const database = await salesDatabase(databaseName);
    const result = await selectSaleHeaders().execute(database);
    return this.hydrateMany(database, result.rows);
  }

  async listPage(
    databaseName: string,
    options: { page: number; pageSize: number; search: string; status: string }
  ) {
    const database = await salesDatabase(databaseName);
    const search = `%${options.search.trim()}%`;
    const status = options.status;
    const offset = (options.page - 1) * options.pageSize;
    const scope = currentBillingScope();
    const [result, countResult] = await Promise.all([
      selectSalePageHeaders(search, status, options.pageSize, offset).execute(database),
      sql<{ total: string | number }>`
        SELECT COUNT(*) AS total
        FROM billing_sales s
        INNER JOIN core_contacts customer ON customer.id = s.customer_id
        LEFT JOIN core_work_orders work_order ON work_order.id = s.work_order_id
        WHERE s.deleted_at IS NULL
          AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
          AND (${status} = 'all' OR s.status = ${status})
          AND (
            ${search} = '%%' OR s.invoice_number LIKE ${search} OR customer.name LIKE ${search}
            OR COALESCE(work_order.code, '') LIKE ${search}
            OR DATE_FORMAT(s.issued_on, '%Y-%m-%d') LIKE ${search}
            OR s.status LIKE ${search} OR CAST(s.amount AS CHAR) LIKE ${search}
          )
      `.execute(database)
    ]);
    return {
      items: await this.hydrateMany(database, result.rows),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(countResult.rows[0]?.total ?? 0)
    };
  }

  async get(databaseName: string, uuid: string) {
    const database = await salesDatabase(databaseName);
    const result = await selectSaleHeaders(uuid).execute(database);
    const row = result.rows[0];
    return row ? this.hydrate(database, row) : null;
  }

  async context(databaseName: string): Promise<SaleContext | null> {
    const database = await salesDatabase(databaseName);
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

  async referenceState(databaseName: string, input: SaleSavePayload): Promise<SaleReferenceState> {
    const database = await salesDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<Record<keyof SaleReferenceState, number>>`
      SELECT
        EXISTS(SELECT 1 FROM core_companies WHERE id = ${input.companyId} AND id=${scope.companyId} AND status = 'active') AS company,
        EXISTS(SELECT 1 FROM core_financial_years WHERE id = ${input.financialYearId} AND id=${scope.financialYearId} AND status = 'active' AND ${input.issuedOn} BETWEEN start_date AND end_date) AS financialYear,
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
    input: SaleSavePayload
  ): Promise<SaleSavePayload> {
    const database = await salesDatabase(databaseName);
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

    const items: SaleSavePayload["items"] = [];
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

  async validItemReferenceIds(databaseName: string, input: SaleSavePayload) {
    const database = await salesDatabase(databaseName);
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

  async findByInvoiceNumber(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    invoiceNumber: string,
    excludeUuid?: string
  ) {
    const database = await salesDatabase(databaseName);
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM billing_sales
      WHERE company_id = ${companyId}
        AND financial_year_id = ${financialYearId}
        AND invoice_number = ${invoiceNumber}
        AND deleted_at IS NULL
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async create(
    databaseName: string,
    input: SaleSavePayload,
    totals: Pick<Sale, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await salesDatabase(databaseName);
    const uuid = publicUuid();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          const lineResult = await sql<{ line_number: number }>`
            SELECT COALESCE(MAX(line_number), 0) + 1 AS line_number
            FROM billing_sales
            WHERE company_id = ${input.companyId} AND financial_year_id = ${input.financialYearId}
          `.execute(transaction);
          const lineNumber = Number(lineResult.rows[0]?.line_number ?? 1);
          const inserted = await sql`
            INSERT INTO billing_sales (
              uuid, company_id, financial_year_id, line_number, invoice_number, customer_id,
              billing_address_id, shipping_address_id, work_order_id, ledger_id, tax_type,
              currency_id, issued_on, subtotal, tax_amount, round_off, amount, terms, notes, status
            ) VALUES (
              ${uuid}, ${input.companyId}, ${input.financialYearId}, ${lineNumber}, ${input.invoiceNumber},
              ${input.customerId}, ${input.billingAddressId}, ${input.shippingAddressId},
              ${input.workOrderId}, ${input.ledgerId}, ${input.taxType ?? "cgst-sgst"},
              ${input.currencyId}, ${input.issuedOn}, ${totals.subtotal}, ${totals.taxAmount},
              ${input.roundOff ?? 0}, ${totals.amount}, ${input.terms ?? ""}, ${input.notes}, ${input.status}
            )
          `.execute(transaction);
          const saleId = Number(inserted.insertId);
          await insertItems(transaction, saleId, totals.items);
          await insertActivity(transaction, saleId, "created", "create", null, input.status);
        });
        return this.get(databaseName, uuid);
      } catch (error) {
        if (isDuplicateKey(error, "billing_sales_line_unique") && attempt < 4) continue;
        if (isDuplicateKey(error, "billing_sales_invoice_unique")) {
          throw new SalesInvoiceReservationConflict(input.invoiceNumber);
        }
        throw error;
      }
    }
    throw new Error("Sales line number could not be reserved after five attempts.");
  }

  async update(
    databaseName: string,
    uuid: string,
    input: SaleSavePayload,
    totals: Pick<Sale, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await salesDatabase(databaseName);
    const existing = await internalSale(database, uuid);
    if (!existing) return null;
    try {
      await database.transaction().execute(async (transaction) => {
        await sql`
        UPDATE billing_sales SET
          company_id = ${input.companyId}, financial_year_id = ${input.financialYearId},
          invoice_number = ${input.invoiceNumber}, customer_id = ${input.customerId},
          billing_address_id = ${input.billingAddressId}, shipping_address_id = ${input.shippingAddressId},
          work_order_id = ${input.workOrderId}, ledger_id = ${input.ledgerId},
          tax_type = ${input.taxType ?? "cgst-sgst"}, currency_id = ${input.currencyId},
          issued_on = ${input.issuedOn}, subtotal = ${totals.subtotal}, tax_amount = ${totals.taxAmount},
          round_off = ${input.roundOff ?? 0}, amount = ${totals.amount}, terms = ${input.terms ?? ""},
          notes = ${input.notes}, status = ${input.status}, updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
        `.execute(transaction);
        await sql`DELETE FROM billing_sales_items WHERE sales_id = ${existing.id}`.execute(
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
    } catch (error) {
      if (isDuplicateKey(error, "billing_sales_invoice_unique")) {
        throw new SalesInvoiceReservationConflict(input.invoiceNumber);
      }
      throw error;
    }
    return this.get(databaseName, uuid);
  }

  async setStatus(databaseName: string, uuid: string, status: SaleStatus) {
    const database = await salesDatabase(databaseName);
    const existing = await internalSale(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_sales SET status = ${status},
          confirmed_at = ${status === "confirmed" ? sql`CURRENT_TIMESTAMP(3)` : null},
          cancelled_at = ${status === "cancelled" ? sql`CURRENT_TIMESTAMP(3)` : null},
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
      await insertActivity(transaction, existing.id, status, "status", existing.status, status);
    });
    return this.get(databaseName, uuid);
  }

  async softDelete(databaseName: string, uuid: string) {
    const database = await salesDatabase(databaseName);
    const existing = await internalSale(database, uuid);
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
        UPDATE billing_sales SET deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
    });
    return { uuid };
  }

  async updateCompliance(
    databaseName: string,
    uuid: string,
    patch: { einvoice?: SaleEinvoiceDetails; eway?: SaleEwayDetails }
  ) {
    const database = await salesDatabase(databaseName);
    const existing = await internalSale(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      if (patch.einvoice) await upsertEinvoice(transaction, existing.id, patch.einvoice);
      if (patch.eway) await upsertEway(transaction, existing.id, patch.eway);
      await sql`UPDATE billing_sales SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ${existing.id}`.execute(
        transaction
      );
      await insertActivity(
        transaction,
        existing.id,
        "compliance",
        "generate",
        existing.status,
        existing.status
      );
    });
    return this.get(databaseName, uuid);
  }

  private async hydrate(database: Kysely<SalesDatabase>, row: SaleHeaderRow): Promise<Sale> {
    return (await this.hydrateMany(database, [row]))[0]!;
  }

  private async hydrateMany(
    database: Kysely<SalesDatabase>,
    rows: SaleHeaderRow[]
  ): Promise<Sale[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [itemsResult, einvoiceResult, ewayResult] = await Promise.all([
      selectSaleItems(ids).execute(database),
      sql<SaleEinvoiceRow>`
        SELECT e.sales_id, e.irn, e.ack_number,
               DATE_FORMAT(e.ack_date, '%Y-%m-%dT%H:%i:%s') AS ack_date,
               e.signed_qr, e.status
        FROM billing_sales_einvoices e
        INNER JOIN (
          SELECT sales_id, MAX(id) AS id FROM billing_sales_einvoices
          WHERE sales_id IN (${sql.join(ids)}) GROUP BY sales_id
        ) latest ON latest.id = e.id
      `.execute(database),
      sql<SaleEwayRow>`
        SELECT e.sales_id, e.bill_number, DATE_FORMAT(e.bill_date, '%Y-%m-%d') AS bill_date,
               e.part, e.transport_id, t.name AS transport_name, t.gst AS transport_gst,
               e.vehicle_number, e.status, e.notes
        FROM billing_sales_eway_bills e
        INNER JOIN (
          SELECT sales_id, MAX(id) AS id FROM billing_sales_eway_bills
          WHERE sales_id IN (${sql.join(ids)}) GROUP BY sales_id
        ) latest ON latest.id = e.id
        LEFT JOIN core_transports t ON t.id = e.transport_id
      `.execute(database)
    ]);
    const itemsBySale = new Map<number, SaleItemRow[]>();
    for (const item of itemsResult.rows) {
      const items = itemsBySale.get(item.sales_id) ?? [];
      items.push(item);
      itemsBySale.set(item.sales_id, items);
    }
    const einvoiceBySale = new Map(einvoiceResult.rows.map((item) => [item.sales_id, item]));
    const ewayBySale = new Map(ewayResult.rows.map((item) => [item.sales_id, item]));
    return rows.map((row) =>
      this.toSale(
        row,
        itemsBySale.get(row.id) ?? [],
        einvoiceBySale.get(row.id),
        ewayBySale.get(row.id)
      )
    );
  }

  private toSale(
    row: SaleHeaderRow,
    items: SaleItemRow[],
    einvoice: SaleEinvoiceRow | undefined,
    eway: SaleEwayRow | undefined
  ): Sale {
    return {
      amount: money(row.amount),
      billingAddress: formatAddress(row, "billing"),
      billingAddressId: row.billing_address_id,
      companyId: row.company_id,
      companyName: row.company_name,
      createdAt: row.created_at,
      currencyCode: row.currency_code,
      currencyId: row.currency_id,
      customerEmail: row.customer_email ?? "",
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone ?? "",
      einvoice: einvoice
        ? {
            ackDate: einvoice.ack_date ?? "",
            ackNo: einvoice.ack_number ?? "",
            irn: einvoice.irn,
            signedQr: einvoice.signed_qr ?? "",
            status: einvoice.status
          }
        : defaultEinvoice(),
      eway: eway
        ? {
            billDate: eway.bill_date,
            billNo: eway.bill_number,
            notes: eway.notes ?? "",
            part: eway.part,
            status: eway.status,
            transport: eway.transport_name ?? "",
            transportGst: eway.transport_gst ?? "",
            transportId: eway.transport_id,
            vehicleNo: eway.vehicle_number ?? ""
          }
        : defaultEway(),
      financialYearId: row.financial_year_id,
      financialYearName: row.financial_year_name,
      id: row.uuid,
      invoiceNumber: row.invoice_number,
      issuedOn: row.issued_on,
      items: items.map(toSaleItem),
      ledgerId: row.ledger_id,
      lineNumber: row.line_number,
      notes: row.notes ?? "",
      numberingWarning: "",
      roundOff: money(row.round_off),
      salesLedger: row.ledger_name ?? "",
      shippingAddress: formatAddress(row, "shipping"),
      shippingAddressId: row.shipping_address_id,
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
