import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../../shared/document/PageTitle";
import { BillingLayout } from "../../../shared/layout/BillingLayout";
import { StockStatementWorkspace } from "./stock-statement.workspace";

export function StockStatementPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Stock Statement"
      subtitle="Review tenant-isolated stock movement and closing quantities."
      title="Billing Reports"
    >
      <PageTitle title="Stock Statement" />
      <StockStatementWorkspace />
    </BillingLayout>
  );
}
