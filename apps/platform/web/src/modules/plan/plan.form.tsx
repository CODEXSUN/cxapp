import { RegistryForm } from "../../shared/registry-workspace";
import { planFields } from "./plan.list";
import type { Plan, PlanSavePayload } from "./plan.types";
export function PlanForm(props: {
  error?: string;
  initialValue: PlanSavePayload;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: PlanSavePayload) => void;
  title: string;
}) {
  return <RegistryForm<Plan> fields={planFields} {...props} />;
}
