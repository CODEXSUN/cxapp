import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../../shared/document/PageTitle";
import { BillingLayout } from "../../../shared/layout/BillingLayout";
import { CustomerStatementWorkspace } from "./customer-statement.workspace";

export function CustomerStatementPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Customer Statement"
      subtitle="Review tenant-isolated customer receivables and receipt movements."
      title="Billing Reports"
    >
      <PageTitle title="Customer Statement" />
      <CustomerStatementWorkspace />
    </BillingLayout>
  );
}
