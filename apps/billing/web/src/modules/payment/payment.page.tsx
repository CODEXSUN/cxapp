import { useRouterState } from "@tanstack/react-router";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { PaymentWorkspace } from "./payment.workspace";
export function PaymentPage() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={path}
      headerTitle="Payment"
      subtitle="Record supplier payments and allocations."
      title="Billing Workspace"
    >
      <PaymentWorkspace />
    </BillingLayout>
  );
}
