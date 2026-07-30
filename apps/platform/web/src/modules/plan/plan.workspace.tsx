import { toast } from "sonner";
import { RegistryWorkspace } from "../../shared/registry-workspace";
import { usePlanMutations, usePlansQuery } from "./plan.hooks";
import { planFields } from "./plan.list";
import { planSchema } from "./plan.schema";
import type { PlanSavePayload } from "./plan.types";
const empty: PlanSavePayload = {
  annualPrice: 0,
  code: "",
  companyLimit: 1,
  description: "",
  monthlyPrice: 0,
  name: "",
  status: "active",
  userLimit: 3
};
export function PlanWorkspace() {
  const query = usePlansQuery();
  const mutations = usePlanMutations();
  const save = (payload: PlanSavePayload, action: (value: PlanSavePayload) => void) => {
    const parsed = planSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Plan validation failed");
      return;
    }
    action(parsed.data);
  };
  return (
    <RegistryWorkspace
      createLabel="New plan"
      description="Manage pricing, limits, billing options, and plan availability."
      fields={planFields}
      initialValue={empty}
      loading={query.isLoading}
      records={query.data ?? []}
      saving={mutations.create.isPending || mutations.update.isPending}
      saveError={(mutations.create.error ?? mutations.update.error)?.message}
      singular="Plan"
      technicalName="page.plan.list"
      title="Plans"
      onCreate={(value) => save(value, mutations.create.mutate)}
      onRefresh={() => void query.refetch()}
      onUpdate={(id, value) => save(value, (payload) => mutations.update.mutate({ id, payload }))}
    />
  );
}
