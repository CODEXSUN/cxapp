import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { ExportSalesWorkspace } from "./export-sales.workspace";

export function ExportSalesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Export Sale"
      subtitle="Create, review, print, and manage tenant-isolated export sale vouchers."
      title="Billing Workspace"
    >
      <PageTitle title="Export Sale" />
      <ExportSalesWorkspace />
    </BillingLayout>
  );
}

export const ExportSalePage = ExportSalesPage;
