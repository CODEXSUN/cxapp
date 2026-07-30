import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../../shared/document/PageTitle";
import { BillingLayout } from "../../../shared/layout/BillingLayout";
import { SupplierStatementWorkspace } from "./supplier-statement.workspace";

export function SupplierStatementPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Supplier Statement"
      subtitle="Review tenant-isolated supplier payables and payment movements."
      title="Billing Reports"
    >
      <PageTitle title="Supplier Statement" />
      <SupplierStatementWorkspace />
    </BillingLayout>
  );
}
