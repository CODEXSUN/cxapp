import { toast } from "sonner";
import { RegistryWorkspace } from "../../shared/registry-workspace";
import { useIndustriesQuery, useIndustryMutations } from "./industry.hooks";
import { industryFields } from "./industry.list";
import { industrySchema } from "./industry.schema";
import type { IndustrySavePayload } from "./industry.types";
const empty: IndustrySavePayload = {
  code: "",
  description: "",
  moduleKeysText: "platform.application",
  name: "",
  status: "active"
};
export function IndustryWorkspace() {
  const query = useIndustriesQuery();
  const mutations = useIndustryMutations();
  const save = (value: IndustrySavePayload, action: (payload: IndustrySavePayload) => void) => {
    const parsed = industrySchema.safeParse(value);
    if (!parsed.success) return void toast.error("Industry validation failed");
    action(parsed.data);
  };
  return (
    <RegistryWorkspace
      createLabel="New industry"
      description="Manage industry packs, default modules, and availability."
      fields={industryFields}
      initialValue={empty}
      loading={query.isLoading}
      records={query.data ?? []}
      saving={mutations.create.isPending || mutations.update.isPending}
      saveError={(mutations.create.error ?? mutations.update.error)?.message}
      singular="Industry"
      technicalName="page.industry.list"
      title="Industries"
      onCreate={(value) => save(value, mutations.create.mutate)}
      onRefresh={() => void query.refetch()}
      onUpdate={(id, value) => save(value, (payload) => mutations.update.mutate({ id, payload }))}
    />
  );
}
