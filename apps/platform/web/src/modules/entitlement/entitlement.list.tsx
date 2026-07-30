import { RegistryList, type RegistryField } from "../../shared/registry-workspace";
import type { PlatformApp } from "../app-registry/app-registry.types";
import type { Plan } from "../plan/plan.types";
import type { Tenant } from "../tenant/tenant.types";
import type { Entitlement } from "./entitlement.types";

export function entitlementFields(
  tenants: Array<Pick<Tenant, "id" | "tenantName">>,
  plans: Array<Pick<Plan, "id" | "name">>,
  apps: Array<Pick<PlatformApp, "id" | "label" | "moduleKey">>,
  createPlan?: (name: string) => Promise<{ label: string; value: string }>,
  createApp?: (name: string) => Promise<{ label: string; value: string }>
): RegistryField<Entitlement>[] {
  return [
    { key: "appLabel", label: "App", list: true },
    { key: "moduleKey", label: "Module key", required: true },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: ["tenant", "plan"].map((value) => ({ label: value, value }))
    },
    { key: "tenantName", label: "Tenant", list: true },
    { key: "planName", label: "Plan", list: true },
    {
      key: "tenantId",
      label: "Tenant",
      list: false,
      parse: (value) => Number(value) || null,
      type: "reference",
      options: [
        { label: "None", value: "0" },
        ...tenants.map((item) => ({ label: item.tenantName, value: String(item.id) }))
      ]
    },
    {
      key: "planId",
      label: "Plan",
      list: false,
      parse: (value) => Number(value) || null,
      ...(createPlan ? { createFromSearch: createPlan } : {}),
      type: "reference",
      options: [
        { label: "None", value: "0" },
        ...plans.map((item) => ({ label: item.name, value: String(item.id) }))
      ]
    },
    {
      key: "appId",
      label: "App",
      list: false,
      parse: Number,
      required: true,
      type: "reference",
      ...(createApp ? { createFromSearch: createApp } : {}),
      options: apps.map((item) => ({ label: item.label, value: String(item.id) }))
    },
    { key: "startsOn", label: "Starts on", required: true },
    { key: "endsOn", label: "Ends on", list: false },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: ["manual", "seed", "subscription"].map((value) => ({ label: value, value }))
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["active", "inactive"].map((value) => ({ label: value, value }))
    }
  ];
}

export function EntitlementList({
  fields,
  ...props
}: {
  fields: RegistryField<Entitlement>[];
  loading: boolean;
  records: Entitlement[];
  onEdit: (record: Entitlement) => void;
  onView: (record: Entitlement) => void;
}) {
  return <RegistryList fields={fields} {...props} />;
}
