import { AppError } from "@codexsun/framework/errors";
import { env } from "../../env.js";
import type {
  ExportSale,
  ExportSaleEinvoiceDetails,
  ExportSaleEwayDetails
} from "./export-sales.types.js";

type WhiteBooksResponse = Record<string, unknown>;
type ComplianceResult = {
  einvoice?: Partial<ExportSaleEinvoiceDetails>;
  eway?: Partial<ExportSaleEwayDetails>;
  response: unknown;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function generateExportSaleEinvoice(
  exportSale: ExportSale
): Promise<ComplianceResult> {
  const response = await callWhiteBooks(
    "/einvoice/type/GENERATE/version/V1_03",
    "POST",
    buildEinvoicePayload(exportSale),
    await authToken()
  );
  assertProviderSuccess(response);
  const data = responseData(response);
  return {
    einvoice: {
      ackDate: text(data.AckDt ?? data.ackDt),
      ackNo: text(data.AckNo ?? data.ackNo),
      irn: text(data.Irn ?? data.IRN ?? data.irn),
      signedQr: text(data.SignedQRCode ?? data.signedQr),
      status: "generated"
    },
    response
  };
}

export async function generateExportSaleEway(exportSale: ExportSale): Promise<ComplianceResult> {
  const irn = exportSale.einvoice.irn;
  if (!irn) throw AppError.validation("Generate the e-invoice before generating the E-way bill.");
  const response = await callWhiteBooks(
    "/einvoice/type/GENERATE_EWAYBILL/version/V1_03",
    "POST",
    {
      Distance: 0,
      Irn: irn,
      TransDocDt: exportSale.eway.billDate || exportSale.issuedOn,
      TransDocNo: exportSale.eway.billNo || exportSale.invoiceNumber,
      TransMode: "1",
      TransType: "Regular",
      TransId: exportSale.eway.transportGst || undefined,
      VehNo: exportSale.eway.vehicleNo || undefined
    },
    await authToken()
  );
  assertProviderSuccess(response);
  const data = responseData(response);
  return {
    eway: {
      billDate: text(data.EwbDt ?? data.ewayBillDate ?? exportSale.eway.billDate),
      billNo: text(data.EwbNo ?? data.ewayBillNo),
      status: "generated"
    },
    response
  };
}

async function authToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const response = await callWhiteBooks("/einvoice/authenticate", "GET");
  assertProviderSuccess(response);
  const data = responseData(response);
  const token = text(data.AuthToken ?? data.authToken ?? data.authtoken ?? data["auth-token"]);
  if (!token) throw new Error("WhiteBooks authentication did not return an auth token.");
  cachedToken = { value: token, expiresAt: Date.now() + 45 * 60 * 1000 };
  return token;
}

async function callWhiteBooks(
  endpoint: string,
  method: "GET" | "POST",
  payload?: unknown,
  token?: string
) {
  const config = providerConfig();
  const url = new URL(endpoint, `${config.baseUrl}/`);
  url.searchParams.set("email", config.email);
  const response = await fetch(url, {
    ...(method === "POST" ? { body: JSON.stringify(payload ?? {}) } : {}),
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      gstin: config.gstin,
      ip_address: config.ipAddress,
      ...(token ? { "auth-token": token } : { password: config.password }),
      username: config.username
    },
    method
  });
  const textBody = await response.text();
  const parsed = textBody ? parseJson(textBody) : {};
  if (!response.ok) throw new Error(`WhiteBooks request failed (${response.status}).`);
  return parsed;
}

function providerConfig() {
  const missing = [
    ["GSP_EMAIL", env.GSP_EMAIL],
    ["GSP_USERNAME", env.GSP_USERNAME],
    ["GSP_PASSWORD", env.GSP_PASSWORD],
    ["GSP_CLIENT_ID", env.GSP_CLIENT_ID],
    ["GSP_CLIENT_SECRET", env.GSP_CLIENT_SECRET],
    ["GSP_GSTIN", env.GSP_GSTIN]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length)
    throw AppError.validation(`WhiteBooks configuration is missing: ${missing.join(", ")}.`);
  return {
    baseUrl: env.GSP_ENVIRONMENT === "production" ? env.GSP_BASE_URL : env.GSP_SANDBOX_BASE_URL,
    clientId: env.GSP_CLIENT_ID,
    clientSecret: env.GSP_CLIENT_SECRET,
    email: env.GSP_EMAIL,
    gstin: env.GSP_GSTIN,
    ipAddress: env.GSP_IP_ADDRESS,
    password: env.GSP_PASSWORD,
    username: env.GSP_USERNAME
  };
}

function buildEinvoicePayload(exportSale: ExportSale) {
  const sellerGstin = env.GSP_GSTIN;
  return {
    BuyerDtls: {
      Gstin: "URP",
      LglNm: exportSale.customerName,
      Pos: sellerGstin.slice(0, 2) || "33"
    },
    DocDtls: { Dt: exportSale.issuedOn, No: exportSale.invoiceNumber, Typ: "INV" },
    ItemList: exportSale.items.map((item, index) => ({
      AssAmt: item.taxableAmount,
      HsnCd: item.hsnCode || "9999",
      Qty: item.quantity,
      SlNo: String(index + 1),
      TotAmt: item.taxableAmount,
      Unit: item.unit || "NOS",
      UnitPrice: item.rate
    })),
    SellerDtls: { Gstin: sellerGstin },
    TranDtls: { TaxSch: "GST", SupTyp: "B2C" },
    ValDtls: {
      AssVal: exportSale.subtotal,
      IgstVal: exportSale.taxType === "igst" ? exportSale.taxAmount : 0,
      TotInvVal: exportSale.amount
    }
  };
}

function responseData(value: unknown): WhiteBooksResponse {
  if (!value || typeof value !== "object") return {};
  const record = value as WhiteBooksResponse;
  return record.data && typeof record.data === "object"
    ? (record.data as WhiteBooksResponse)
    : record;
}

function assertProviderSuccess(value: unknown) {
  const record = responseData(value);
  const status = text(record.status_cd ?? record.status ?? record.Status);
  if (status && !["1", "success", "succeeded", "sucess"].includes(status.toLowerCase())) {
    throw new Error(
      text(record.ErrorDetails ?? record.error ?? record.message) ||
        "WhiteBooks rejected the request."
    );
  }
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { message: value };
  }
}
