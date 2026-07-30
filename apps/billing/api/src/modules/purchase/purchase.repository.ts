import { sql, type Kysely } from "kysely";
import { currentBillingScope } from "../../auth/billing-scope.js";
import {
  PurchaseDatabase,
  PurchaseHeaderRow,
  PurchaseReferenceState,
  emptyPurchaseEinvoice,
  emptyPurchaseEway,
  existingIds,
  formatAddress,
  insertActivity,
  insertItems,
  internalPurchase,
  isDuplicateKey,
  money,
  nonNullIds,
  parsePurchaseEinvoice,
  parsePurchaseEway,
  publicUuid,
  purchaseDatabase,
  selectPurchaseHeaders,
  selectPurchaseItems,
  toPurchaseItem
} from "./purchase.repository-support.js";
import type {
  Purchase,
  PurchaseContext,
  PurchaseSavePayload,
  PurchaseStatus
} from "./purchase.types.js";

export class PurchaseRepository {
  async list(databaseName: string) {
    const database = await purchaseDatabase(databaseName);
    const result = await selectPurchaseHeaders().execute(database);
    return Promise.all(result.rows.map((row) => this.hydrate(database, row)));
  }

  async listPage(
    databaseName: string,
    options: { customer: string; page: number; pageSize: number; search: string; status: string }
  ) {
    const database = await purchaseDatabase(databaseName);
    const search = `%${options.search.trim()}%`;
    const customer = options.customer.trim().toLowerCase();
    const page = {
      customer,
      limit: options.pageSize,
      offset: (options.page - 1) * options.pageSize,
      search,
      status: options.status
    };
    const scope = currentBillingScope();
    const result = await selectPurchaseHeaders(undefined, page).execute(database);
    const count = await sql<{ total: string | number }>`
      SELECT COUNT(*) AS total FROM billing_purchases s
      INNER JOIN contacts supplier ON supplier.id=s.supplier_id
      LEFT JOIN work_orders work_order ON work_order.id=s.work_order_id
      WHERE s.deleted_at IS NULL
        AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
        AND (${page.status}='all' OR s.status=${page.status})
        AND (${customer}='all' OR LOWER(supplier.name)=${customer})
        AND (${search}='%%' OR s.purchase_number LIKE ${search} OR supplier.name LIKE ${search}
          OR s.supplier_bill_number LIKE ${search} OR COALESCE(work_order.code,'') LIKE ${search}
          OR DATE_FORMAT(s.purchase_date,'%Y-%m-%d') LIKE ${search}
          OR s.status LIKE ${search} OR CAST(s.amount AS CHAR) LIKE ${search})
    `.execute(database);
    return {
      items: await Promise.all(result.rows.map((row) => this.hydrate(database, row))),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(count.rows[0]?.total ?? 0)
    };
  }

  async get(databaseName: string, uuid: string) {
    const database = await purchaseDatabase(databaseName);
    const result = await selectPurchaseHeaders(uuid).execute(database);
    const row = result.rows[0];
    return row ? this.hydrate(database, row) : null;
  }

  async context(databaseName: string): Promise<PurchaseContext | null> {
    const database = await purchaseDatabase(databaseName);
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
      FROM companies c
      CROSS JOIN financial_years f
      INNER JOIN currencies currency ON UPPER(currency.name) = 'INR' AND currency.status = 'active'
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
    input: PurchaseSavePayload
  ): Promise<PurchaseReferenceState> {
    const database = await purchaseDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<Record<keyof PurchaseReferenceState, number>>`
      SELECT
        EXISTS(SELECT 1 FROM companies WHERE id = ${input.companyId} AND id=${scope.companyId} AND status = 'active') AS company,
        EXISTS(SELECT 1 FROM financial_years WHERE id = ${input.financialYearId} AND id=${scope.financialYearId} AND status = 'active' AND ${input.issuedOn} BETWEEN start_date AND end_date) AS financialYear,
        EXISTS(SELECT 1 FROM contacts WHERE id = ${input.supplierId} AND status = 'active') AS supplier,
        EXISTS(SELECT 1 FROM contacts_addresses WHERE id = ${input.billingAddressId} AND parent_id = ${input.supplierId}) AS billingAddress,
        EXISTS(SELECT 1 FROM contacts_addresses WHERE id = ${input.shippingAddressId} AND parent_id = ${input.supplierId}) AS shippingAddress,
        ${input.workOrderId ? sql`EXISTS(SELECT 1 FROM work_orders WHERE id = ${input.workOrderId} AND status = 'active')` : sql`1`} AS workOrder,
        ${input.ledgerId ? sql`EXISTS(SELECT 1 FROM ledgers WHERE id = ${input.ledgerId} AND status = 'active')` : sql`1`} AS ledger,
        EXISTS(SELECT 1 FROM currencies WHERE id = ${input.currencyId} AND status = 'active') AS currency
    `.execute(database);
    const row = result.rows[0];
    return {
      billingAddress: Boolean(row?.billingAddress),
      company: Boolean(row?.company),
      currency: Boolean(row?.currency),
      supplier: Boolean(row?.supplier),
      financialYear: Boolean(row?.financialYear),
      ledger: Boolean(row?.ledger),
      shippingAddress: Boolean(row?.shippingAddress),
      workOrder: Boolean(row?.workOrder)
    };
  }

  async resolveMissingReferences(
    databaseName: string,
    input: PurchaseSavePayload
  ): Promise<PurchaseSavePayload> {
    const database = await purchaseDatabase(databaseName);
    const context = await this.context(databaseName);
    const contactResult =
      input.supplierId > 0
        ? null
        : await sql<{ id: number }>`
            SELECT id FROM contacts
            WHERE LOWER(name) = LOWER(${input.supplierName}) AND status = 'active'
            LIMIT 1
          `.execute(database);
    const supplierId = input.supplierId || Number(contactResult?.rows[0]?.id ?? 0);
    const addressResult =
      supplierId > 0 && (!input.billingAddressId || !input.shippingAddressId)
        ? await sql<{ id: number }>`
            SELECT id FROM contacts_addresses
            WHERE parent_id = ${supplierId}
            ORDER BY is_default DESC, sort_order, id
          `.execute(database)
        : null;
    const addressIds = addressResult?.rows.map((row) => Number(row.id)) ?? [];
    const workOrderResult = !input.workOrderId
      ? await sql<{ id: number }>`
            SELECT id FROM work_orders
            WHERE status = 'active'
            ORDER BY CASE WHEN code=${input.workOrderNo} AND ${input.workOrderNo}<>'' THEN 0
              WHEN TRIM(code)='-' THEN 1 ELSE 2 END,id LIMIT 1
          `.execute(database)
      : null;
    const ledgerResult = !input.ledgerId
      ? await sql<{ id: number }>`
            SELECT id FROM ledgers
            WHERE status = 'active'
            ORDER BY CASE WHEN LOWER(name)=LOWER(${input.salesLedger}) AND ${input.salesLedger}<>'' THEN 0
              WHEN TRIM(name)='-' THEN 1 ELSE 2 END,id LIMIT 1
          `.execute(database)
      : null;

    const items: PurchaseSavePayload["items"] = [];
    for (const item of input.items) {
      const product =
        item.productId || item.productName
          ? await sql<{
              id: number;
              hsn_code_id: number | null;
              tax_id: number | null;
              unit_id: number | null;
            }>`
              SELECT id, hsn_code_id, gst_tax_id AS tax_id, unit_id FROM products
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
            }>`SELECT id FROM hsn_codes WHERE code = ${item.hsnCode} AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const colour =
        !item.colourId && item.colour
          ? await sql<{
              id: number;
            }>`SELECT id FROM colours WHERE LOWER(name) = LOWER(${item.colour}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const size =
        !item.sizeId && item.size
          ? await sql<{
              id: number;
            }>`SELECT id FROM sizes WHERE LOWER(name) = LOWER(${item.size}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const unit =
        !item.unitId && item.unit
          ? await sql<{
              id: number;
            }>`SELECT id FROM units WHERE LOWER(name) = LOWER(${item.unit}) AND status = 'active' LIMIT 1`.execute(
              database
            )
          : null;
      const tax = !item.taxId
        ? await sql<{
            id: number;
          }>`SELECT id FROM taxes WHERE rate_percent = ${item.taxRate} AND status = 'active' LIMIT 1`.execute(
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
      supplierId,
      financialYearId: input.financialYearId || context?.financialYearId || 0,
      items,
      ledgerId: input.ledgerId ?? ledgerResult?.rows[0]?.id ?? null,
      shippingAddressId: input.shippingAddressId || addressIds[1] || addressIds[0] || 0,
      workOrderId: input.workOrderId ?? workOrderResult?.rows[0]?.id ?? null
    };
  }

  async validItemReferenceIds(databaseName: string, input: PurchaseSavePayload) {
    const database = await purchaseDatabase(databaseName);
    return {
      colours: await existingIds(database, sql`SELECT id FROM colours WHERE status = 'active'`),
      hsnCodes: await existingIds(database, sql`SELECT id FROM hsn_codes WHERE status = 'active'`),
      products: await existingIds(
        database,
        sql`SELECT id FROM products WHERE status = 'active' AND deleted_at IS NULL`
      ),
      sizes: await existingIds(database, sql`SELECT id FROM sizes WHERE status = 'active'`),
      taxes: await existingIds(database, sql`SELECT id FROM taxes WHERE status = 'active'`),
      units: await existingIds(database, sql`SELECT id FROM units WHERE status = 'active'`),
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

  async findByPurchaseNumber(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    invoiceNumber: string
  ) {
    const database = await purchaseDatabase(databaseName);
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM billing_purchases
      WHERE company_id = ${companyId}
        AND financial_year_id = ${financialYearId}
        AND purchase_number = ${invoiceNumber}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async create(
    databaseName: string,
    input: PurchaseSavePayload,
    totals: Pick<Purchase, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await purchaseDatabase(databaseName);
    const uuid = publicUuid();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          const lineResult = await sql<{ line_number: number }>`
        SELECT COALESCE(MAX(line_number), 0) + 1 AS line_number
        FROM billing_purchases
        WHERE company_id = ${input.companyId} AND financial_year_id = ${input.financialYearId}
      `.execute(transaction);
          const lineNumber = Number(lineResult.rows[0]?.line_number ?? 1);
          const inserted = await sql`
        INSERT INTO billing_purchases (
          uuid, company_id, financial_year_id, line_number, purchase_number, supplier_id,
          supplier_bill_number, supplier_bill_date,
          billing_address_id, shipping_address_id, work_order_id, ledger_id, tax_type,
          currency_id, purchase_date, subtotal, tax_amount, round_off, amount, terms, notes, status,
          purchase_eway_json, purchase_einvoice_json
        ) VALUES (
          ${uuid}, ${input.companyId}, ${input.financialYearId}, ${lineNumber}, ${input.invoiceNumber},
          ${input.supplierId}, ${input.supplierBillNo ?? null}, ${input.supplierBillDate || null},
          ${input.billingAddressId}, ${input.shippingAddressId},
          ${input.workOrderId}, ${input.ledgerId}, ${input.taxType ?? "cgst-sgst"},
          ${input.currencyId}, ${input.issuedOn}, ${totals.subtotal}, ${totals.taxAmount},
          ${input.roundOff ?? 0}, ${totals.amount}, ${input.terms ?? ""}, ${input.notes}, ${input.status},
          ${JSON.stringify(input.eway ?? emptyPurchaseEway())},
          ${JSON.stringify(input.einvoice ?? emptyPurchaseEinvoice())}
        )
      `.execute(transaction);
          const purchaseId = Number(inserted.insertId);
          await insertItems(transaction, purchaseId, totals.items);
          await insertActivity(transaction, purchaseId, "created", "create", null, input.status);
        });
        break;
      } catch (error) {
        if (isDuplicateKey(error, "billing_purchases_line_unique") && attempt < 4) continue;
        throw error;
      }
    }
    return this.get(databaseName, uuid);
  }

  async update(
    databaseName: string,
    uuid: string,
    input: PurchaseSavePayload,
    totals: Pick<Purchase, "amount" | "items" | "subtotal" | "taxAmount">
  ) {
    const database = await purchaseDatabase(databaseName);
    const existing = await internalPurchase(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_purchases SET
          company_id = ${input.companyId}, financial_year_id = ${input.financialYearId},
          purchase_number = ${input.invoiceNumber}, supplier_id = ${input.supplierId},
          supplier_bill_number = ${input.supplierBillNo ?? null},
          supplier_bill_date = ${input.supplierBillDate || null},
          billing_address_id = ${input.billingAddressId}, shipping_address_id = ${input.shippingAddressId},
          work_order_id = ${input.workOrderId}, ledger_id = ${input.ledgerId},
          tax_type = ${input.taxType ?? "cgst-sgst"}, currency_id = ${input.currencyId},
          purchase_date = ${input.issuedOn}, subtotal = ${totals.subtotal}, tax_amount = ${totals.taxAmount},
          round_off = ${input.roundOff ?? 0}, amount = ${totals.amount}, terms = ${input.terms ?? ""},
          notes = ${input.notes}, status = ${input.status}, updated_at = CURRENT_TIMESTAMP(3)
          , purchase_eway_json = ${JSON.stringify(input.eway ?? emptyPurchaseEway())}
          , purchase_einvoice_json = ${JSON.stringify(input.einvoice ?? emptyPurchaseEinvoice())}
        WHERE id = ${existing.id}
      `.execute(transaction);
      await sql`DELETE FROM billing_purchase_items WHERE purchase_id = ${existing.id}`.execute(
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

  async setStatus(databaseName: string, uuid: string, status: PurchaseStatus) {
    const database = await purchaseDatabase(databaseName);
    const existing = await internalPurchase(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_purchases SET status = ${status},
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
    const database = await purchaseDatabase(databaseName);
    const existing = await internalPurchase(database, uuid);
    if (!existing) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE billing_purchases
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
    const database = await purchaseDatabase(databaseName);
    const existing = await internalPurchase(database, uuid);
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
        UPDATE billing_purchases SET deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${existing.id}
      `.execute(transaction);
    });
    return { uuid };
  }

  private async hydrate(
    database: Kysely<PurchaseDatabase>,
    row: PurchaseHeaderRow
  ): Promise<Purchase> {
    const itemsResult = await selectPurchaseItems(row.id).execute(database);
    return {
      amount: money(row.amount),
      billingAddress: formatAddress(row, "billing"),
      billingAddressId: row.billing_address_id,
      companyId: row.company_id,
      companyName: row.company_name,
      createdAt: row.created_at,
      currencyCode: row.currency_code,
      currencyId: row.currency_id,
      einvoice: parsePurchaseEinvoice(row.purchase_einvoice_json),
      eway: parsePurchaseEway(row.purchase_eway_json),
      supplierEmail: row.supplier_email ?? "",
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierPhone: row.supplier_phone ?? "",
      supplierBillDate: row.supplier_bill_date ?? "",
      supplierBillNo: row.supplier_bill_number ?? "",
      financialYearId: row.financial_year_id,
      financialYearName: row.financial_year_name,
      generatedSalesInvoiceNo: row.generated_sales_invoice_no ?? "",
      id: row.uuid,
      invoiceNumber: row.purchase_number,
      issuedOn: row.purchase_date,
      items: itemsResult.rows.map(toPurchaseItem),
      ledgerId: row.ledger_id,
      lineNumber: row.line_number,
      notes: row.notes ?? "",
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
