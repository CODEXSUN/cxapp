import { toast } from "sonner";
import { RegistryWorkspace } from "../../shared/registry-workspace";
import { usePlatformAppMutations, usePlatformAppsQuery } from "./app-registry.hooks";
import { appRegistryFields } from "./app-registry.list";
import { appRegistrySchema } from "./app-registry.schema";
import type { PlatformAppSavePayload } from "./app-registry.types";
const empty: PlatformAppSavePayload = {
  alwaysEnabled: false,
  appId: "application",
  defaultLanding: false,
  description: "",
  label: "",
  moduleKey: "",
  stack: "platform"
};
export function AppRegistryWorkspace() {
  const query = usePlatformAppsQuery();
  const mutations = usePlatformAppMutations();
  const save = (
    value: PlatformAppSavePayload,
    action: (payload: PlatformAppSavePayload) => void
  ) => {
    const parsed = appRegistrySchema.safeParse(value);
    if (!parsed.success) return void toast.error("App validation failed");
    action(parsed.data);
  };
  return (
    <RegistryWorkspace
      createLabel="New app"
      description="Manage platform applications, module keys, stacks, and activation defaults."
      fields={appRegistryFields}
      initialValue={empty}
      loading={query.isLoading}
      records={query.data ?? []}
      saving={mutations.create.isPending || mutations.update.isPending}
      saveError={(mutations.create.error ?? mutations.update.error)?.message}
      singular="App"
      technicalName="page.app-registry.list"
      title="Apps"
      onCreate={(value) => save(value, mutations.create.mutate)}
      onRefresh={() => void query.refetch()}
      onUpdate={(id, value) => save(value, (payload) => mutations.update.mutate({ id, payload }))}
    />
  );
}
