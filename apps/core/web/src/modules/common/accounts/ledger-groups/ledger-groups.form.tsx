import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { ledgerGroupSchema } from "./ledger-groups.schema";
import type { LedgerGroupRecord, LedgerGroupSavePayload } from "./ledger-groups.types";
const empty: LedgerGroupSavePayload = { name: "", status: "active" };
export function LedgerGroupsForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: LedgerGroupSavePayload) => void;
  open: boolean;
  record: LedgerGroupRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the ledger group details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} ledger group`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initial={record ? { name: record.name, status: record.status } : empty}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function Body({
  error,
  initial,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initial: LedgerGroupSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: LedgerGroupSavePayload) => void;
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  const shown = validation || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = ledgerGroupSchema.safeParse(value);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check the ledger group details.");
          return;
        }
        setValidation("");
        onSubmit(parsed.data);
      }}
    >
      {shown ? <WorkspaceFormBanner title="Unable to save">{shown}</WorkspaceFormBanner> : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="Ledger group name" required>
          <Input
            autoFocus
            maxLength={200}
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Ledger group active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save ledger group"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save ledger group
            </>
          )
        }}
      />
    </form>
  );
}
