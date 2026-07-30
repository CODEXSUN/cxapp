import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingLayout } from "../../shared/layout/BillingLayout";
import { QuotationWorkspace } from "./quotation.workspace";

export function QuotationPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="Quotation"
      subtitle="Create, review, print, and convert tenant-isolated quotation vouchers."
      title="Billing Workspace"
    >
      <PageTitle title="Quotation" />
      <QuotationWorkspace />
    </BillingLayout>
  );
}
