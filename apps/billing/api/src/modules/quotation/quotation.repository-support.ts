import { sql, type Kysely, type RawBuilder, type Transaction } from "kysely";
import { randomBytes } from "node:crypto";
import { currentBillingScope } from "../../auth/billing-scope.js";
import { getBillingDatabase } from "../../database/billing-database.js";
import type { QuotationLineItem, QuotationStatus } from "./quotation.types.js";

export type QuotationDatabase = Record<string, never>;
export type QuotationTransaction = Transaction<QuotationDatabase>;

export type QuotationHeaderRow = {
  amount: string | number;
  billing_address_id: number;
  billing_address_line1: string;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_district: string | null;
  billing_pincode: string | null;
  billing_state: string | null;
  billing_state_code: string | null;
  company_id: number;
  company_name: string;
  created_at: string;
  currency_code: string;
  currency_id: number;
  customer_email: string | null;
  customer_gstin: string | null;
  customer_id: number;
  customer_name: string;
  customer_phone: string | null;
  financial_year_id: number;
  financial_year_name: string;
  generated_sales_invoice_no: string | null;
  id: number;
  quotation_number: string;
  quotation_date: string;
  ledger_id: number | null;
  ledger_name: string | null;
  line_number: number;
  notes: string | null;
  round_off: string | number;
  shipping_address_id: number;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  shipping_district: string | null;
  shipping_pincode: string | null;
  shipping_state: string | null;
  shipping_state_code: string | null;
  status: QuotationStatus;
  subtotal: string | number;
  tax_amount: string | number;
  tax_type: "cgst-sgst" | "igst";
  terms: string | null;
  updated_at: string;
  uuid: string;
  work_order_id: number | null;
  work_order_no: string | null;
};

export type QuotationItemRow = {
  quotation_id: number;
  cgst_amount: string | number;
  colour_id: number | null;
  colour_name: string | null;
  dc_no: string | null;
  description: string;
  hsn_code: string | null;
  hsn_code_id: number | null;
  igst_amount: string | number;
  line_number: number;
  line_total: string | number;
  po_no: string | null;
  product_id: number | null;
  product_name: string | null;
  quantity: string | number;
  rate: string | number;
  sgst_amount: string | number;
  size_id: number | null;
  size_name: string | null;
  tax_amount: string | number;
  tax_id: number | null;
  tax_rate: string | number;
  taxable_amount: string | number;
  unit_id: number;
  unit_name: string;
  uuid: string;
};

export type QuotationReferenceState = {
  billingAddress: boolean;
  company: boolean;
  currency: boolean;
  customer: boolean;
  financialYear: boolean;
  ledger: boolean;
  shippingAddress: boolean;
  workOrder: boolean;
};

export function isDuplicateKey(error: unknown, keyName: string) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "ER_DUP_ENTRY" && candidate.message?.includes(keyName) === true;
}

export function quotationDatabase(databaseName: string) {
  return getBillingDatabase(databaseName) as unknown as Promise<Kysely<QuotationDatabase>>;
}

export function selectQuotationHeaders(
  uuid?: string,
  page?: { customer: string; limit: number; offset: number; search: string; status: string }
) {
  const scope = currentBillingScope();
  return sql<QuotationHeaderRow>`
    SELECT s.id, s.uuid, s.company_id, company.name AS company_name,
           s.financial_year_id, financial_year.name AS financial_year_name,
           s.line_number, s.quotation_number, s.customer_id, customer.name AS customer_name,
           customer.primary_email AS customer_email, customer.primary_phone AS customer_phone,
           customer.gstin AS customer_gstin,
           s.billing_address_id, billing.address_line1 AS billing_address_line1,
           billing.address_line2 AS billing_address_line2, billing.city_name AS billing_city,
           billing.district_name AS billing_district, billing.state_name AS billing_state,
           billing.pincode_name AS billing_pincode, billing.country_name AS billing_country,
           billing_state_record.code AS billing_state_code,
           s.shipping_address_id, shipping.address_line1 AS shipping_address_line1,
           shipping.address_line2 AS shipping_address_line2, shipping.city_name AS shipping_city,
           shipping.district_name AS shipping_district, shipping.state_name AS shipping_state,
           shipping.pincode_name AS shipping_pincode, shipping.country_name AS shipping_country,
           shipping_state_record.code AS shipping_state_code,
           s.work_order_id, work_order.code AS work_order_no, s.ledger_id,
           ledger.name AS ledger_name, s.tax_type, s.currency_id, currency.name AS currency_code,
           DATE_FORMAT(s.quotation_date, '%Y-%m-%d') AS quotation_date,
            s.subtotal, s.tax_amount, s.round_off, s.amount, s.terms, s.notes, s.status,
            s.generated_sales_invoice_no,
           DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
           DATE_FORMAT(s.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
    FROM billing_quotations s
    INNER JOIN core_companies company ON company.id = s.company_id
    INNER JOIN core_financial_years financial_year ON financial_year.id = s.financial_year_id
    INNER JOIN core_contacts customer ON customer.id = s.customer_id
    INNER JOIN core_contacts_addresses billing ON billing.id = s.billing_address_id
    INNER JOIN core_contacts_addresses shipping ON shipping.id = s.shipping_address_id
    LEFT JOIN core_states billing_state_record ON billing_state_record.id = billing.state_id
    LEFT JOIN core_states shipping_state_record ON shipping_state_record.id = shipping.state_id
    INNER JOIN core_currencies currency ON currency.id = s.currency_id
    LEFT JOIN core_work_orders work_order ON work_order.id = s.work_order_id
    LEFT JOIN core_ledgers ledger ON ledger.id = s.ledger_id
    WHERE s.deleted_at IS NULL
      AND s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
      ${uuid ? sql`AND s.uuid = ${uuid}` : sql``}
      ${
        page
          ? sql`AND (${page.status}='all' OR s.status=${page.status})
        AND (${page.customer}='all' OR LOWER(customer.name)=${page.customer})
        AND (${page.search}='%%' OR s.quotation_number LIKE ${page.search}
          OR customer.name LIKE ${page.search} OR COALESCE(work_order.code,'') LIKE ${page.search}
          OR DATE_FORMAT(s.quotation_date,'%Y-%m-%d') LIKE ${page.search}
          OR s.status LIKE ${page.search} OR CAST(s.amount AS CHAR) LIKE ${page.search})`
          : sql``
      }
    ORDER BY s.line_number DESC, s.quotation_date DESC, s.id DESC
    ${page ? sql`LIMIT ${page.limit} OFFSET ${page.offset}` : sql``}
  `;
}

export function selectQuotationItems(quotationIds: number | number[]) {
  const ids = Array.isArray(quotationIds) ? quotationIds : [quotationIds];
  return sql<QuotationItemRow>`
    SELECT item.quotation_id, item.uuid, item.line_number, item.product_id, product.name AS product_name,
           item.description, item.hsn_code_id, hsn.code AS hsn_code, item.po_no, item.dc_no,
           item.colour_id, colour.name AS colour_name, item.size_id, size.name AS size_name,
           item.quantity, item.unit_id, unit.name AS unit_name, item.rate,
           item.tax_id, item.tax_rate, item.taxable_amount, item.cgst_amount,
           item.sgst_amount, item.igst_amount, item.tax_amount, item.line_total
    FROM billing_quotation_items item
    LEFT JOIN core_products product ON product.id = item.product_id
    LEFT JOIN core_hsn_codes hsn ON hsn.id = item.hsn_code_id
    LEFT JOIN core_colours colour ON colour.id = item.colour_id
    LEFT JOIN core_sizes size ON size.id = item.size_id
    INNER JOIN core_units unit ON unit.id = item.unit_id
    LEFT JOIN core_taxes tax ON tax.id = item.tax_id
    WHERE item.quotation_id IN (${sql.join(ids)})
    ORDER BY item.quotation_id, item.line_number
  `;
}

export async function internalQuotation(database: Kysely<QuotationDatabase>, uuid: string) {
  const scope = currentBillingScope();
  const result = await sql<{ id: number; status: QuotationStatus }>`
    SELECT id, status FROM billing_quotations WHERE uuid = ${uuid}
      AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      AND deleted_at IS NULL LIMIT 1
  `.execute(database);
  return result.rows[0] ?? null;
}

export async function insertItems(
  transaction: QuotationTransaction,
  quotationId: number,
  items: QuotationLineItem[]
) {
  for (const item of items) {
    await sql`
      INSERT INTO billing_quotation_items (
        uuid, quotation_id, line_number, product_id, description, hsn_code_id, po_no, dc_no,
        colour_id, size_id, quantity, unit_id, rate, tax_id, tax_rate, taxable_amount,
        cgst_amount, sgst_amount, igst_amount, tax_amount, line_total
      ) VALUES (
        ${publicUuid()}, ${quotationId}, ${item.lineNumber}, ${item.productId}, ${item.description},
        ${item.hsnCodeId}, ${item.poNo ?? ""}, ${item.dcNo ?? ""}, ${item.colourId},
        ${item.sizeId}, ${item.quantity}, ${item.unitId}, ${item.rate}, ${item.taxId},
        ${item.taxRate}, ${item.taxableAmount}, ${item.cgstAmount}, ${item.sgstAmount},
        ${item.igstAmount}, ${item.taxAmount}, ${item.lineTotal}
      )
    `.execute(transaction);
  }
}

export async function insertActivity(
  transaction: QuotationTransaction,
  quotationId: number,
  activityType: string,
  action: string,
  previousStatus: QuotationStatus | null,
  newStatus: QuotationStatus | null
) {
  await sql`
    INSERT INTO billing_quotation_activities (
      uuid, quotation_id, activity_type, action, description, previous_status, new_status
    ) VALUES (
      ${publicUuid()}, ${quotationId}, ${activityType}, ${action},
      ${`Quotation ${activityType}.`}, ${previousStatus}, ${newStatus}
    )
  `.execute(transaction);
}

export async function existingIds(database: Kysely<QuotationDatabase>, query: RawBuilder<unknown>) {
  const result = await query.execute(database);
  return new Set((result.rows as Array<{ id: number }>).map((row) => Number(row.id)));
}

export function nonNullIds(values: Array<number | null>) {
  return [
    ...new Set(
      values.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value) && value > 0
      )
    )
  ];
}

export function toQuotationItem(row: QuotationItemRow): QuotationLineItem {
  return {
    cgstAmount: money(row.cgst_amount),
    colour: row.colour_name ?? "",
    colourId: row.colour_id,
    dcNo: row.dc_no ?? "",
    description: row.description,
    hsnCode: row.hsn_code ?? "",
    hsnCodeId: row.hsn_code_id,
    id: row.uuid,
    igstAmount: money(row.igst_amount),
    lineNumber: row.line_number,
    lineTotal: money(row.line_total),
    poNo: row.po_no ?? "",
    productId: row.product_id,
    productName: row.product_name ?? "",
    quantity: Number(row.quantity),
    rate: Number(row.rate),
    sgstAmount: money(row.sgst_amount),
    size: row.size_name ?? "",
    sizeId: row.size_id,
    taxAmount: money(row.tax_amount),
    taxId: row.tax_id,
    taxRate: Number(row.tax_rate),
    taxableAmount: money(row.taxable_amount),
    unit: row.unit_name,
    unitId: row.unit_id
  };
}

export function formatAddress(row: QuotationHeaderRow, kind: "billing" | "shipping") {
  const prefix = kind === "billing" ? "billing" : "shipping";
  const value = (name: string) => row[`${prefix}_${name}` as keyof QuotationHeaderRow];
  return [
    value("address_line1"),
    value("address_line2"),
    [value("city"), value("district")].filter(Boolean).join(", "),
    [value("state"), value("pincode")].filter(Boolean).join(" - "),
    value("country")
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function addressDetails(row: QuotationHeaderRow, kind: "billing" | "shipping") {
  const prefix = kind === "billing" ? "billing" : "shipping";
  const value = (name: string) =>
    String(row[`${prefix}_${name}` as keyof QuotationHeaderRow] ?? "").trim();
  return {
    addressLine1: value("address_line1"),
    addressLine2: value("address_line2"),
    cityName: value("city"),
    districtName: value("district"),
    pincodeName: value("pincode"),
    stateCode: value("state_code"),
    stateName: value("state")
  };
}

export function publicUuid() {
  return randomBytes(4).toString("hex");
}

export function money(value: string | number | null | undefined) {
  return Number(Number(value ?? 0).toFixed(2));
}
