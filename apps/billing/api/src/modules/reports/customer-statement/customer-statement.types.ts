export type CustomerStatementDocumentKind = "export-sale" | "receipt" | "sale";

export type CustomerStatementQuery = {
  companyId?: number | undefined;
  contactId?: number | undefined;
  from?: string | undefined;
  page: number;
  pageSize: number;
  to?: string | undefined;
};

export type CustomerStatementContact = {
  code: string;
  gstin: string;
  id: number;
  name: string;
};

export type CustomerStatementLine = {
  balance: number;
  credit: number;
  date: string;
  debit: number;
  documentId: string;
  documentNumber: string;
  kind: CustomerStatementDocumentKind;
  narration: string;
};

export type CustomerStatementResult = {
  closingBalance: number;
  companyId: number;
  companyName: string;
  contacts: CustomerStatementContact[];
  financialYearId: number;
  financialYearName: string;
  from: string;
  items: CustomerStatementLine[];
  openingBalance: number;
  page: number;
  pageSize: number;
  periodCredit: number;
  periodDebit: number;
  selectedContact: CustomerStatementContact | null;
  to: string;
  total: number;
};
