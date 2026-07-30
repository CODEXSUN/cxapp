import { RegistryForm } from "../../shared/registry-workspace";
import { appRegistryFields } from "./app-registry.list";
import type { PlatformApp, PlatformAppSavePayload } from "./app-registry.types";
export function AppRegistryForm(props: {
  error?: string;
  initialValue: PlatformAppSavePayload;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: PlatformAppSavePayload) => void;
  title: string;
}) {
  return <RegistryForm<PlatformApp> fields={appRegistryFields} {...props} />;
}
