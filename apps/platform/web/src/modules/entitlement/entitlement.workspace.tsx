import { toast } from "sonner";
import { RegistryWorkspace } from "../../shared/registry-workspace";
import { usePlatformAppMutations, usePlatformAppsQuery } from "../app-registry/app-registry.hooks";
import { usePlanMutations, usePlansQuery } from "../plan/plan.hooks";
import { useTenantsQuery } from "../tenant/tenant.hooks";
import { useEntitlementMutations, useEntitlementsQuery } from "./entitlement.hooks";
import { entitlementFields } from "./entitlement.list";
import { entitlementSchema } from "./entitlement.schema";
import type { Entitlement, EntitlementSavePayload } from "./entitlement.types";

const empty: Omit<Entitlement, "id" | "uuid"> = {
  appId: 0,
  appLabel: "",
  endsOn: null,
  moduleKey: "",
  planId: null,
  planName: null,
  scope: "plan",
  source: "manual",
  startsOn: new Date().toISOString().slice(0, 10),
  status: "active",
  tenantId: null,
  tenantName: null
};

export function EntitlementWorkspace() {
  const query = useEntitlementsQuery();
  const tenants = useTenantsQuery();
  const plans = usePlansQuery();
  const apps = usePlatformAppsQuery();
  const mutations = useEntitlementMutations();
  const planMutations = usePlanMutations();
  const appMutations = usePlatformAppMutations();
  const fields = entitlementFields(
    tenants.data ?? [],
    plans.data ?? [],
    apps.data ?? [],
    createPlan,
    createApp
  );

  async function createPlan(name: string) {
    const trimmed = name.trim();
    const code =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "plan";
    const plan = await planMutations.create.mutateAsync({
      annualPrice: 0,
      code,
      companyLimit: 1,
      description: `${trimmed} platform plan`,
      monthlyPrice: 0,
      name: trimmed,
      status: "active",
      userLimit: 3
    });
    return { label: plan.name, value: String(plan.id) };
  }

  async function createApp(name: string) {
    const trimmed = name.trim();
    const code =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") || "app";
    const app = await appMutations.create.mutateAsync({
      alwaysEnabled: false,
      appId: code.split(".")[0] || "application",
      defaultLanding: false,
      description: `${trimmed} application module`,
      label: trimmed,
      moduleKey: code.includes(".") ? code : `platform.${code}`,
      stack: "platform"
    });
    return { label: app.label, value: String(app.id) };
  }

  const save = (
    value: Omit<Entitlement, "id" | "uuid">,
    action: (payload: EntitlementSavePayload) => void
  ) => {
    const app = (apps.data ?? []).find((item) => item.id === value.appId);
    const payload = {
      appId: value.appId,
      endsOn: value.endsOn || null,
      moduleKey: value.moduleKey || app?.moduleKey || "",
      planId: value.planId || null,
      scope: value.scope,
      source: value.source,
      startsOn: value.startsOn,
      status: value.status,
      tenantId: value.tenantId || null
    };
    const parsed = entitlementSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Entitlement validation failed");
      return;
    }
    action(parsed.data);
  };

  return (
    <RegistryWorkspace
      createLabel="New entitlement"
      description="Control which plans or tenants can use each app and module."
      fields={fields}
      initialValue={empty}
      loading={query.isLoading || tenants.isLoading || plans.isLoading || apps.isLoading}
      records={query.data ?? []}
      saving={
        mutations.create.isPending ||
        mutations.update.isPending ||
        planMutations.create.isPending ||
        appMutations.create.isPending
      }
      saveError={
        (
          mutations.create.error ??
          mutations.update.error ??
          planMutations.create.error ??
          appMutations.create.error
        )?.message
      }
      singular="Entitlement"
      technicalName="page.entitlement.list"
      title="Entitlements"
      onCreate={(value) => save(value, mutations.create.mutate)}
      onRefresh={() => {
        void query.refetch();
        void tenants.refetch();
        void plans.refetch();
        void apps.refetch();
      }}
      onUpdate={(id, value) => save(value, (payload) => mutations.update.mutate({ id, payload }))}
    />
  );
}
