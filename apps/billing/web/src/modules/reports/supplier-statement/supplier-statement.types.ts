export type SupplierStatementDocumentKind = "payment" | "purchase";

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

export type SupplierStatement = {
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

export type SupplierStatementFilters = {
  contactId?: number | undefined;
  from: string;
  page: number;
  pageSize: number;
  to: string;
};
