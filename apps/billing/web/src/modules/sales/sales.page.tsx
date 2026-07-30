import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { SalesWorkspace } from "./sales.workspace";

export function SalesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Sale"
      subtitle="Create, review, print, and convert tenant-isolated sale vouchers."
      title="Billing Workspace"
    >
      <PageTitle title="Sale" />
      <SalesWorkspace />
    </BillingLayout>
  );
}

export const SalePage = SalesPage;
