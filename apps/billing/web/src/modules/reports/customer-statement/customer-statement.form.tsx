import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceFormField, WorkspaceLookup } from "@codexsun/ui/workspace";
import type { CustomerStatementContact } from "./customer-statement.types";

export function CustomerStatementForm({
  contactId,
  contacts,
  from,
  onContactChange,
  onFromChange,
  onToChange,
  to
}: {
  contactId?: number | undefined;
  contacts: CustomerStatementContact[];
  from: string;
  onContactChange: (value?: number) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  to: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 shadow-sm md:grid-cols-3">
      <WorkspaceFormField label="Customer">
        <WorkspaceLookup
          allowTextValue={false}
          clearable
          options={contacts.map((contact) => ({
            description: [contact.code, contact.gstin].filter(Boolean).join(" · "),
            label: contact.name,
            value: String(contact.id)
          }))}
          placeholder="Select customer"
          showAllOptionsOnFocus
          value={contactId ? String(contactId) : ""}
          onValueChange={(value) => onContactChange(value ? Number(value) : undefined)}
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
