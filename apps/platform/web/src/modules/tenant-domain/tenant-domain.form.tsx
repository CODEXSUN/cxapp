import { Input } from "@codexsun/ui/components/input";
import { WorkspaceFormField } from "@codexsun/ui/workspace/upsert";
import { normalizeTenantDomain } from "./tenant-domain.services";

type TenantPrimaryDomainFieldProps = {
  onChange: (value: string) => void;
  onTouched: () => void;
  value: string;
};

export function TenantPrimaryDomainField({
  onChange,
  onTouched,
  value
}: TenantPrimaryDomainFieldProps) {
  return (
    <WorkspaceFormField label="Primary domain" required>
      <Input
        className="h-11 rounded-md font-mono"
        value={value}
        onChange={(event) => {
          onTouched();
          onChange(normalizeTenantDomain(event.target.value));
        }}
        placeholder="localhost"
        required
      />
    </WorkspaceFormField>
  );
}
