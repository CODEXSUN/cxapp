import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { PurchaseWorkspace } from "./purchase.workspace";

export function PurchasePage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Purchase"
      subtitle="Create, review, print, and convert tenant-isolated purchase vouchers."
      title="Billing Workspace"
    >
      <PageTitle title="Purchase" />
      <PurchaseWorkspace />
    </BillingLayout>
  );
}
