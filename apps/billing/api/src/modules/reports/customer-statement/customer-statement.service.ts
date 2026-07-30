import { AppError } from "@codexsun/framework/errors";
import { CustomerStatementRepository } from "./customer-statement.repository.js";
import type {
  CustomerStatementQuery,
  CustomerStatementResult
} from "./customer-statement.types.js";

export class CustomerStatementService {
  constructor(private readonly repository = new CustomerStatementRepository()) {}

  async get(databaseName: string, query: CustomerStatementQuery): Promise<CustomerStatementResult> {
    const context = await this.repository.context(databaseName, query.companyId);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before opening Customer Statement."
      );
    }
    const from = query.from || context.financial_year_start;
    const to = query.to || context.financial_year_end;
    validateDates(from, to, context.financial_year_start, context.financial_year_end);
    const contacts = await this.repository.contacts(databaseName, context.company_id);
    const selectedContact =
      contacts.find((contact) => contact.id === query.contactId) ?? contacts[0] ?? null;
    if (!selectedContact) {
      return {
        closingBalance: 0,
        companyId: context.company_id,
        companyName: context.company_name,
        contacts,
        financialYearId: context.financial_year_id,
        financialYearName: context.financial_year_name,
        from,
        items: [],
        openingBalance: 0,
        page: query.page,
        pageSize: query.pageSize,
        periodCredit: 0,
        periodDebit: 0,
        selectedContact: null,
        to,
        total: 0
      };
    }
    const openingBalance = await this.repository.openingBalance(
      databaseName,
      context.company_id,
      selectedContact.id,
      from
    );
    const summary = await this.repository.summary(
      databaseName,
      context.company_id,
      selectedContact.id,
      from,
      to
    );
    const items = await this.repository.lines(
      databaseName,
      {
        companyId: context.company_id,
        contactId: selectedContact.id,
        from,
        page: query.page,
        pageSize: query.pageSize,
        to
      },
      openingBalance
    );
    return {
      closingBalance: money(openingBalance + summary.debit - summary.credit),
      companyId: context.company_id,
      companyName: context.company_name,
      contacts,
      financialYearId: context.financial_year_id,
      financialYearName: context.financial_year_name,
      from,
      items,
      openingBalance,
      page: query.page,
      pageSize: query.pageSize,
      periodCredit: summary.credit,
      periodDebit: summary.debit,
      selectedContact,
      to,
      total: summary.total
    };
  }
}

function validateDates(from: string, to: string, yearStart: string, yearEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw AppError.validation("Customer Statement dates must use YYYY-MM-DD format.");
  }
  if (from > to) throw AppError.validation("Customer Statement From date cannot be after To date.");
  if (from < yearStart || to > yearEnd)
    throw AppError.validation("Customer Statement dates must stay inside the selected Financial Year.");
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}
