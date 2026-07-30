import { RegistryList, type RegistryField } from "../../shared/registry-workspace";
import type { Plan } from "./plan.types";
export const planFields: RegistryField<Plan>[] = [
  { key: "name", label: "Plan", required: true },
  { key: "code", label: "Code", required: true },
  { key: "monthlyPrice", label: "Monthly price", type: "number" },
  { key: "annualPrice", label: "Annual price", type: "number" },
  { key: "userLimit", label: "Users", type: "number" },
  { key: "companyLimit", label: "Companies", type: "number" },
  { key: "description", label: "Description", list: false },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" }
    ]
  }
];
export function PlanList(props: {
  loading: boolean;
  records: Plan[];
  onEdit: (record: Plan) => void;
  onView: (record: Plan) => void;
}) {
  return <RegistryList fields={planFields} {...props} />;
}
