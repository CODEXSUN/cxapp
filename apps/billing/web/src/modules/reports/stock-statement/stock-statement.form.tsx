import { Input } from "@codexsun/ui/components/input";
import { WorkspaceFormField } from "@codexsun/ui/workspace";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";

export function StockStatementForm({
  from,
  onFromChange,
  onSearchChange,
  onToChange,
  search,
  to
}: {
  from: string;
  onFromChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToChange: (value: string) => void;
  search: string;
  to: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 shadow-sm md:grid-cols-3">
      <WorkspaceFormField label="Product or HSN">
        <Input
          className="h-11"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search product or HSN"
          value={search}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="From date">
        <WorkspaceDatePicker value={from} onValueChange={onFromChange} />
      </WorkspaceFormField>
      <WorkspaceFormField label="To date">
        <WorkspaceDatePicker value={to} onValueChange={onToChange} />
      </WorkspaceFormField>
    </div>
  );
}
