import { RegistryForm, type RegistryField } from "../../shared/registry-workspace";
import type { Subscription, SubscriptionSavePayload } from "./subscription.types";
export function SubscriptionForm({
  fields,
  ...props
}: {
  fields: RegistryField<Subscription>[];
  error?: string | undefined;
  initialValue: SubscriptionSavePayload;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: SubscriptionSavePayload) => void;
  title: string;
}) {
  return <RegistryForm<Subscription> fields={fields} {...props} />;
}
