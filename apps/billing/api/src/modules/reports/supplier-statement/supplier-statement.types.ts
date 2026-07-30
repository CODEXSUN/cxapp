export type SupplierStatementDocumentKind = "payment" | "purchase";

export type SupplierStatementQuery = {
  companyId?: number | undefined;
  contactId?: number | undefined;
  from?: string | undefined;
  page: number;
  pageSize: number;
  to?: string | undefined;
};

export type SupplierStatementContact = {
  code: string;
  gstin: string;
  id: number;
  name: string;
};

export type SupplierStatementLine = {
  balance: number;
  credit: number;
  date: string;
  debit: number;
  documentId: string;
  documentNumber: string;
  kind: SupplierStatementDocumentKind;
  narration: string;
};

export type SupplierStatementResult = {
  closingBalance: number;
  companyId: number;
  companyName: string;
  contacts: SupplierStatementContact[];
  financialYearId: number;
  financialYearName: string;
  from: string;
  items: SupplierStatementLine[];
  openingBalance: number;
  page: number;
  pageSize: number;
  periodCredit: number;
  periodDebit: number;
  selectedContact: SupplierStatementContact | null;
  to: string;
  total: number;
};
