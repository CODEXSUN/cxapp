import { RegistryForm, type RegistryField } from "../../shared/registry-workspace";
import type { Entitlement } from "./entitlement.types";

export function EntitlementForm(props: {
  error?: string | undefined;
  fields: RegistryField<Entitlement>[];
  initialValue: Omit<Entitlement, "id" | "uuid">;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: Omit<Entitlement, "id" | "uuid">) => void;
  title: string;
}) {
  return <RegistryForm {...props} />;
}
