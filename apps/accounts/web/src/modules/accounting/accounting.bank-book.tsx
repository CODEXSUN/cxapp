import { BookWorkspace } from "./accounting.book";

export function BankBookWorkspace() {
  return (
    <BookWorkspace
      description="Record bank receipts and payments and view the running bank balance."
      kind="bank"
      technicalName="page.accounts.bank-book"
      title="Bank Book"
    />
  );
}