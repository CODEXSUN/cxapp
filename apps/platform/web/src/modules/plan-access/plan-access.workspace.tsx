import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { usePlansQuery } from "../plan/plan.hooks";
import { usePlanAccessMutation, usePlanAccessQuery } from "./plan-access.hooks";
import { PlanAccessForm } from "./plan-access.form";
import { normalizePlanAccessKeys, planAccessSchema } from "./plan-access.schema";

export function PlanAccessWorkspace() {
  const plans = usePlansQuery();
  const [planId, setPlanId] = useState(0);
  const access = usePlanAccessQuery(planId);
  const mutation = usePlanAccessMutation(planId);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(["platform.application"]);
  const apps = access.data?.apps ?? [];

  useEffect(() => {
    if (access.data)
      setSelectedKeys(
        normalizePlanAccessKeys(
          access.data.apps.filter((app) => app.enabled).map((app) => app.moduleKey)
        )
      );
  }, [access.data]);

  function toggle(moduleKey: string, enabled: boolean) {
    if (moduleKey === "platform.application") return;
    setSelectedKeys((current) =>
      normalizePlanAccessKeys(
        enabled ? [...current, moduleKey] : current.filter((key) => key !== moduleKey)
      )
    );
  }

  function save() {
    const parsed = planAccessSchema.safeParse({ moduleKeys: selectedKeys });
    if (!parsed.success) return void toast.error("Plan access validation failed");
    mutation.mutate(parsed.data.moduleKeys);
  }

  return (
    <WorkspacePage
      title="Plan Access"
      description="Choose which platform apps and modules are included in each plan."
      technicalName="page.plan-access.matrix"
    >
      <div className="max-w-md">
        <WorkspaceSelect
          value={planId ? String(planId) : ""}
          options={(plans.data ?? []).map((plan) => ({ label: plan.name, value: String(plan.id) }))}
          placeholder="Select plan"
          onValueChange={(value) => setPlanId(Number(value))}
        />
      </div>
      {planId ? (
        <PlanAccessForm
          apps={apps}
          saving={mutation.isPending || access.isLoading}
          selectedKeys={selectedKeys}
          error={mutation.error?.message}
          onSave={save}
          onToggle={toggle}
        />
      ) : null}
    </WorkspacePage>
  );
}
