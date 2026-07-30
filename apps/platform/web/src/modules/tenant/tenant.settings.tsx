import { WorkspaceDetailTable, WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import type { Tenant } from "./tenant.types";

export function TenantSettings({ tenant }: { tenant: Tenant }) {
  return (
    <WorkspaceShowCard title="Tenant settings">
      <WorkspaceDetailTable
        rows={[
          ["Default app", tenant.defaultLandingApp],
          ["Modules", tenant.enabledModuleKeys.join(", ") || "None"],
          ["Database", tenant.dbName]
        ]}
      />
    </WorkspaceShowCard>
  );
}
