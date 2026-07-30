import { useEffect, useMemo, useState } from "react";
import { BlocksIcon, ListChecksIcon, SaveIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge, WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { WorkspaceFormField } from "@codexsun/ui/workspace/upsert";
import { platformAppRegistry } from "../../app/app-registry";
import { usePlatformAppsQuery, type PlatformApp } from "../app-registry";
import { updateTenantAppConnections } from "./tenant.services";
import type { Tenant } from "./tenant.types";

export function TenantAppConnections({
  onUpdated,
  tenant
}: {
  onUpdated: (tenant: Tenant) => void;
  tenant: Tenant;
}) {
  const client = useQueryClient();
  const appsQuery = usePlatformAppsQuery();
  const [enabledKeys, setEnabledKeys] = useState(() => tenant.enabledModuleKeys);
  const [landingApp, setLandingApp] = useState<Tenant["defaultLandingApp"]>(
    tenant.defaultLandingApp
  );
  const apps = appsQuery.data ?? [];

  useEffect(() => {
    setEnabledKeys(tenant.enabledModuleKeys);
    setLandingApp(tenant.defaultLandingApp);
  }, [tenant]);

  const enabledApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          app.alwaysEnabled ||
          app.moduleKey === "platform.application" ||
          enabledKeys.includes(app.moduleKey)
      ),
    [apps, enabledKeys]
  );
  const save = useMutation({
    mutationFn: () => {
      const normalizedEnabled = Array.from(
        new Set(["platform.application", ...enabledKeys])
      ).sort();
      const disabled = apps
        .filter((app) => !app.alwaysEnabled && !normalizedEnabled.includes(app.moduleKey))
        .map((app) => app.moduleKey);
      return updateTenantAppConnections(tenant, normalizedEnabled, disabled, landingApp);
    },
    onError: (error) =>
      toast.error("App connections could not be saved", {
        description: error instanceof Error ? error.message : "Update failed."
      }),
    onSuccess: async (updated) => {
      await client.invalidateQueries({ queryKey: ["admin", "tenants"] });
      onUpdated(updated);
      toast.success("Tenant app connections updated");
    }
  });

  useEffect(() => {
    if (!enabledApps.some((app) => app.appId === landingApp)) {
      setLandingApp("application");
    }
  }, [enabledApps, landingApp]);

  return (
    <div className="space-y-4">
      <WorkspaceShowCard title="Default connection">
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <WorkspaceFormField label="Landing app">
            <WorkspaceSelect
              value={landingApp}
              options={enabledApps.map((app) => ({ label: app.label, value: app.appId }))}
              onValueChange={(value) => setLandingApp(value as Tenant["defaultLandingApp"])}
            />
          </WorkspaceFormField>
          <Button
            type="button"
            disabled={save.isPending || appsQuery.isLoading}
            onClick={() => save.mutate()}
          >
            <SaveIcon className="size-4" />
            {save.isPending ? "Saving..." : "Save connections"}
          </Button>
        </div>
      </WorkspaceShowCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => {
          const locked = app.alwaysEnabled || app.moduleKey === "platform.application";
          const enabled = locked || enabledKeys.includes(app.moduleKey);
          return (
            <TenantAppSelectionCard
              key={app.id}
              alwaysEnabled={locked}
              appId={app.appId}
              checked={enabled}
              description={app.description}
              label={app.label}
              moduleKey={app.moduleKey}
              onCheckedChange={(checked) =>
                setEnabledKeys((current) =>
                  checked
                    ? Array.from(new Set([...current, app.moduleKey]))
                    : current.filter((key) => key !== app.moduleKey)
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function TenantAppSelectionCard({
  alwaysEnabled,
  appId,
  checked,
  description,
  label,
  moduleKey,
  onCheckedChange
}: {
  alwaysEnabled: boolean;
  appId: PlatformApp["appId"];
  checked: boolean;
  description: string;
  label: string;
  moduleKey: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const locked = alwaysEnabled || moduleKey === "platform.application";
  const registry = platformAppRegistry.find(
    (app) => app.id === appId || app.moduleKey === moduleKey
  );
  const Icon = registry?.icon ?? (appId === "task-manager" ? ListChecksIcon : BlocksIcon);
  const accentClass =
    registry?.accentClass ?? (appId === "task-manager" ? "bg-violet-600" : "bg-slate-600");

  return (
    <WorkspaceSwitchCard
      ariaLabel={`${label} tenant connection`}
      checked={checked}
      className={cn(
        "min-h-40 items-start p-4 opacity-100",
        checked
          ? "border-border bg-muted/45 dark:border-border dark:bg-muted/20"
          : "border-border bg-card"
      )}
      disabled={locked}
      label={
        <span className="block">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-md text-white",
              accentClass
            )}
          >
            <Icon className="size-5" />
          </span>
          <span className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-foreground">{label}</span>
            <WorkspaceStatusBadge
              className="h-5 rounded-full border-0 px-2 text-[11px]"
              label={checked ? "Enabled" : "Disabled"}
              showIcon={false}
              tone={checked ? "success" : "neutral"}
            />
          </span>
        </span>
      }
      description={<span className="block text-sm leading-6">{description}</span>}
      onCheckedChange={onCheckedChange}
    />
  );
}
