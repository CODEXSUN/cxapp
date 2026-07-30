import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { TenantAccessForm } from "./tenant-access.form";
import { useTenantAccessQuery } from "./tenant-access.hooks";
import { TenantAccessList } from "./tenant-access.list";

export function TenantAccessWorkspace() {
  const query = useTenantAccessQuery();
  return (
    <WorkspacePage
      title="Tenant Access"
      description="Review each tenant subscription, manual grants, and final enabled modules."
      technicalName="page.tenant-access.summary"
      actions={
        <TenantAccessForm loading={query.isLoading} onRefresh={() => void query.refetch()} />
      }
    >
      <TenantAccessList records={query.data ?? []} />
    </WorkspacePage>
  );
}
