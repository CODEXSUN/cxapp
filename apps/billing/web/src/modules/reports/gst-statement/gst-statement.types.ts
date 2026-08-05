export type GstStatementDocument = {
  cgstAmount: number;
  contactName: string;
  documentDate: string;
  documentNumber: string;
  documentType: "export-sale" | "purchase" | "sale";
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

export type GstStatementFiling = {
  gstr1Arn: string;
  gstr1FiledOn: string | null;
  gstr3bArn: string;
  gstr3bFiledOn: string | null;
  openingBalance: number;
  updatedAt: string | null;
};

export type GstStatementFilingPayload = Omit<GstStatementFiling, "updatedAt"> & {
  month: number;
  year: number;
};

export type GstStatement = {
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

export type GstStatementFilters = {
  month?: number | undefined;
  year?: number | undefined;
};
