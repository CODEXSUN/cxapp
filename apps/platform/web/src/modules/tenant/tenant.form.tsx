import { Input } from "@codexsun/ui/components/input";
import { WorkspaceFormField, WorkspaceFormGrid } from "@codexsun/ui/workspace/upsert";

export function TenantIdentityFields({
  code,
  name,
  onCodeChange,
  onNameChange
}: {
  code: string;
  name: string;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <WorkspaceFormGrid>
      <WorkspaceFormField label="Tenant name" required>
        <Input required value={name} onChange={(event) => onNameChange(event.target.value)} />
      </WorkspaceFormField>
      <WorkspaceFormField label="Tenant code" required>
        <Input
          className="font-mono"
          required
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
        />
      </WorkspaceFormField>
    </WorkspaceFormGrid>
  );
}
