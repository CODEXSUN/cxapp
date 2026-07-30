import { RegistryList, type RegistryField } from "../../shared/registry-workspace";
import type { Subscription } from "./subscription.types";

export function subscriptionFields(
  tenants: Array<{ id: number; tenantName: string }>,
  plans: Array<{ id: number; name: string }>,
  createPlan?: (name: string) => Promise<{ label: string; value: string }>
): RegistryField<Subscription>[] {
  return [
    { key: "tenantName", label: "Tenant", list: true },
    { key: "planName", label: "Plan", list: true },
    {
      key: "tenantId",
      label: "Tenant",
      list: false,
      options: tenants.map((item) => ({ label: item.tenantName, value: String(item.id) })),
      parse: Number,
      required: true,
      type: "reference"
    },
    {
      key: "planId",
      label: "Plan",
      list: false,
      options: plans.map((item) => ({ label: item.name, value: String(item.id) })),
      parse: Number,
      required: true,
      type: "reference",
      ...(createPlan ? { createFromSearch: createPlan } : {})
    },
    {
      key: "billingCycle",
      label: "Billing cycle",
      type: "select",
      options: [
        { label: "Monthly", value: "monthly" },
        { label: "Annual", value: "annual" }
      ]
    },
    { key: "startsOn", label: "Starts on", required: true },
    { key: "endsOn", label: "Ends on" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["trial", "active", "cancelled", "expired"].map((value) => ({ label: value, value }))
    }
  ];
}

export function SubscriptionList({
  fields,
  ...props
}: {
  fields: RegistryField<Subscription>[];
  loading: boolean;
  records: Subscription[];
  onEdit: (record: Subscription) => void;
  onView: (record: Subscription) => void;
}) {
  return <RegistryList fields={fields} {...props} />;
}
