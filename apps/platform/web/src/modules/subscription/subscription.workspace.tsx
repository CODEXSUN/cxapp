import { toast } from "sonner";
import { RegistryWorkspace } from "../../shared/registry-workspace";
import { usePlanMutations, usePlansQuery } from "../plan/plan.hooks";
import { useTenantsQuery } from "../tenant/tenant.hooks";
import { useSubscriptionMutations, useSubscriptionsQuery } from "./subscription.hooks";
import { subscriptionFields } from "./subscription.list";
import { subscriptionSchema } from "./subscription.schema";
import type { Subscription, SubscriptionSavePayload } from "./subscription.types";

const empty: SubscriptionSavePayload = {
  billingCycle: "monthly",
  endsOn: null,
  planId: 0,
  startsOn: new Date().toISOString().slice(0, 10),
  status: "trial",
  tenantId: 0
};

export function SubscriptionWorkspace() {
  const query = useSubscriptionsQuery();
  const tenants = useTenantsQuery();
  const plans = usePlansQuery();
  const mutations = useSubscriptionMutations();
  const planMutations = usePlanMutations();
  const fields = subscriptionFields(tenants.data ?? [], plans.data ?? [], createPlan);

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

  const save = (
    value: Omit<Subscription, "id" | "uuid">,
    action: (payload: SubscriptionSavePayload) => void
  ) => {
    const payload = {
      billingCycle: value.billingCycle,
      endsOn: value.endsOn || null,
      planId: value.planId,
      startsOn: value.startsOn,
      status: value.status,
      tenantId: value.tenantId
    };
    const parsed = subscriptionSchema.safeParse(payload);
    if (!parsed.success) return void toast.error("Subscription validation failed");
    action(parsed.data);
  };

  return (
    <RegistryWorkspace
      createLabel="New subscription"
      description="Assign tenant plans, billing cycles, dates, and lifecycle status."
      fields={fields}
      initialValue={empty as Omit<Subscription, "id" | "uuid">}
      loading={query.isLoading || tenants.isLoading || plans.isLoading}
      records={query.data ?? []}
      saving={
        mutations.create.isPending || mutations.update.isPending || planMutations.create.isPending
      }
      saveError={
        (mutations.create.error ?? mutations.update.error ?? planMutations.create.error)?.message
      }
      singular="Subscription"
      technicalName="page.subscription.list"
      title="Subscriptions"
      onCreate={(value) => save(value, mutations.create.mutate)}
      onRefresh={() => {
        void query.refetch();
        void tenants.refetch();
        void plans.refetch();
      }}
      onUpdate={(id, value) => save(value, (payload) => mutations.update.mutate({ id, payload }))}
    />
  );
}
