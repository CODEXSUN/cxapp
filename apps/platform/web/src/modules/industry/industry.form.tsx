import { RegistryForm } from "../../shared/registry-workspace";
import { industryFields } from "./industry.list";
import type { Industry, IndustrySavePayload } from "./industry.types";
export function IndustryForm(props: {
  error?: string;
  initialValue: IndustrySavePayload;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: IndustrySavePayload) => void;
  title: string;
}) {
  return <RegistryForm<Industry> fields={industryFields} {...props} />;
}
