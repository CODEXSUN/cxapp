import { RegistryList, type RegistryField } from "../../shared/registry-workspace";
import type { Industry } from "./industry.types";
export const industryFields: RegistryField<Industry>[] = [
  { key: "name", label: "Industry", required: true },
  { key: "code", label: "Code", required: true },
  { key: "moduleKeysText", label: "Default modules" },
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
export function IndustryList(props: {
  loading: boolean;
  records: Industry[];
  onEdit: (record: Industry) => void;
  onView: (record: Industry) => void;
}) {
  return <RegistryList fields={industryFields} {...props} />;
}
