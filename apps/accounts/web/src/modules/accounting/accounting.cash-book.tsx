import { BookWorkspace } from "./accounting.book";

export function CashBookWorkspace() {
  return (
    <BookWorkspace
      description="Record cash receipts and payments and view the running cash balance."
      kind="cash"
      technicalName="page.accounts.cash-book"
      title="Cash Book"
    />
  );
}