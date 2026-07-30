import {
  WorkspaceDetailTable,
  WorkspaceShowCard,
  WorkspaceShowLayout
} from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import type { Tenant } from "./tenant.types";

export function TenantIdentityControl({ tenant }: { tenant: Tenant }) {
  return (
    <WorkspaceShowLayout>
      <WorkspaceShowCard title="Tenant identity">
        <WorkspaceDetailTable
          rows={[
            ["Tenant name", tenant.tenantName],
            ["Tenant code", code(tenant.tenantCode, "tenant-code")],
            ["UUID", code(tenant.uuid, "tenant-uuid")],
            ["Corporate ID", code(tenant.corporateId ?? "-", "corporate-id")],
            ["Mobile", tenant.mobile ?? "-"],
            ["Slug", code(tenant.slug, "tenant-slug")],
            [
              "Status",
              <WorkspaceStatusBadge
                key="tenant-status"
                label={tenant.status}
                tone={tenant.status === "active" ? "success" : "danger"}
              />
            ]
          ]}
        />
      </WorkspaceShowCard>
      <WorkspaceShowCard title="Primary routing">
        <WorkspaceDetailTable
          rows={[
            ["Primary domain", code(tenant.primaryDomain || "-", "primary-domain")],
            ["Landing app", tenant.defaultLandingApp],
            ["Connected apps", tenant.enabledModuleKeys.length],
            ["Database", code(tenant.dbName, "tenant-database")],
            ["Database endpoint", code(`${tenant.dbHost}:${tenant.dbPort}`, "database-endpoint")],
            ["Storage root", code(tenant.storageRoot || "Not provisioned", "storage-root")]
          ]}
        />
      </WorkspaceShowCard>
    </WorkspaceShowLayout>
  );
}

function code(value: string, key: string) {
  return (
    <span className="font-mono text-xs" key={key}>
      {value}
    </span>
  );
}
