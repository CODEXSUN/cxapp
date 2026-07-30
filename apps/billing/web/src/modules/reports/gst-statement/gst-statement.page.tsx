import { useRouterState } from "@tanstack/react-router";
import { PageTitle } from "../../../shared/document/PageTitle";
import { BillingLayout } from "../../../shared/layout/BillingLayout";
import { GstStatementWorkspace } from "./gst-statement.workspace";

export function GstStatementPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BillingLayout
      currentPath={pathname}
      headerTitle="GST Statement"
      subtitle="Review tenant-isolated inward and outward GST totals."
      title="Billing Reports"
    >
      <PageTitle title="GST Statement" />
      <GstStatementWorkspace />
    </BillingLayout>
  );
}
