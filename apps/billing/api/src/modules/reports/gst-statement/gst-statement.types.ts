export type GstStatementQuery = {
  companyId?: number | undefined;
  month?: number | undefined;
  year?: number | undefined;
};

export type GstStatementFilingPayload = {
  gstr1Arn: string;
  gstr1FiledOn: string | null;
  gstr3bArn: string;
  gstr3bFiledOn: string | null;
  month: number;
  openingBalance: number;
  year: number;
};

export type GstStatementFiling = Omit<GstStatementFilingPayload, "month" | "year"> & {
  updatedAt: string | null;
};

export type GstStatementDocumentType = "export-sale" | "purchase" | "sale";

export type GstStatementDocument = {
  cgstAmount: number;
  contactName: string;
  documentDate: string;
  documentNumber: string;
  documentType: GstStatementDocumentType;
  gstin: string;
  igstAmount: number;
  invoiceTotal: number;
  serial: number;
  sgstAmount: number;
  taxableAmount: number;
  taxRates: number[];
};

export type GstStatementHsnLine = {
  cgstAmount: number;
  hsnCode: string;
  igstAmount: number;
  productName: string;
  sgstAmount: number;
  taxableAmount: number;
  totalQuantity: number;
};

export type GstStatementPanel = {
  cgstAmount: number;
  documentCount: number;
  documents: GstStatementDocument[];
  hsn: GstStatementHsnLine[];
  igstAmount: number;
  invoiceTotal: number;
  sgstAmount: number;
  taxAmount: number;
  taxableAmount: number;
};

export type GstStatementResult = {
  availableYears: number[];
  companyGstin: string;
  companyId: number;
  companyName: string;
  filing: GstStatementFiling;
  financialYearId: number;
  financialYearName: string;
  from: string;
  month: number;
  monthLabel: string;
  purchases: GstStatementPanel;
  sales: GstStatementPanel;
  summary: {
    balance: number;
    openingBalance: number;
    purchaseTax: number;
    salesTax: number;
  };
  to: string;
  year: number;
};
