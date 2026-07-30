import { RegistryList, type RegistryField } from "../../shared/registry-workspace";
import type { PlatformApp } from "./app-registry.types";
const yesNo = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" }
];
export const appRegistryFields: RegistryField<PlatformApp>[] = [
  { key: "label", label: "App", required: true },
  { key: "appId", label: "App ID", required: true },
  { key: "moduleKey", label: "Module key", required: true },
  {
    key: "stack",
    label: "Stack",
    type: "select",
    options: [
      { label: "Platform", value: "platform" },
      { label: "Billing", value: "billing" },
      { label: "Platform Task Manager", value: "platform-task-manager" },
      { label: "DevKit", value: "devkit" },
      { label: "Mail", value: "mail" }
    ]
  },
  {
    key: "alwaysEnabled",
    label: "Always enabled",
    type: "select",
    parse: (value) => value === "true",
    options: yesNo
  },
  {
    key: "defaultLanding",
    label: "Default landing",
    type: "select",
    parse: (value) => value === "true",
    options: yesNo
  },
  { key: "description", label: "Description", list: false }
];
export function AppRegistryList(props: {
  loading: boolean;
  records: PlatformApp[];
  onEdit: (record: PlatformApp) => void;
  onView: (record: PlatformApp) => void;
}) {
  return <RegistryList fields={appRegistryFields} {...props} />;
}
