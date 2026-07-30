import { WorkspaceFormField } from "@codexsun/ui/workspace";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";

export function GstStatementForm({
  from,
  onFromChange,
  onToChange,
  to
}: {
  from: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  to: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 shadow-sm md:grid-cols-2">
      <WorkspaceFormField label="From date">
        <WorkspaceDatePicker value={from} onValueChange={onFromChange} />
      </WorkspaceFormField>
      <WorkspaceFormField label="To date">
        <WorkspaceDatePicker value={to} onValueChange={onToChange} />
      </WorkspaceFormField>
    </div>
  );
}
