import { useRouterState } from "@tanstack/react-router";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { ReceiptWorkspace } from "./receipt.workspace";
export function ReceiptPage() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={path}
      headerTitle="Receipt"
      subtitle="Record customer receipts and allocations."
      title="Billing Workspace"
    >
      <ReceiptWorkspace />
    </BillingLayout>
  );
}
