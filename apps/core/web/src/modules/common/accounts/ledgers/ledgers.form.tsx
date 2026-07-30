import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { ledgerSchema } from "./ledgers.schema";
import type { LedgerGroupLookup, LedgerRecord, LedgerSavePayload } from "./ledgers.types";
const empty: LedgerSavePayload = { ledgerGroupId: 0, name: "", status: "active" };
export function LedgersForm({
  error,
  groups,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  groups: LedgerGroupLookup[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: LedgerSavePayload) => void;
  open: boolean;
  record: LedgerRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Choose a ledger group, enter the ledger name, and save."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} ledger`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        groups={groups}
        initial={
          record
            ? { ledgerGroupId: record.ledgerGroupId, name: record.name, status: record.status }
            : empty
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function Body({
  error,
  groups,
  initial,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  groups: LedgerGroupLookup[];
  initial: LedgerSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: LedgerSavePayload) => void;
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  const shown = validation || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = ledgerSchema.safeParse(value);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check the ledger details.");
          return;
        }
        setValidation("");
        onSubmit(parsed.data);
      }}
    >
      {shown ? <WorkspaceFormBanner title="Unable to save">{shown}</WorkspaceFormBanner> : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="Ledger group" required>
          <WorkspaceLookup
            allowTextValue={false}
            options={groups
              .filter((group) => group.status === "active" || group.id === value.ledgerGroupId)
              .map((group) => ({ value: String(group.id), label: group.name }))}
            placeholder="Search ledger group"
            value={value.ledgerGroupId ? String(value.ledgerGroupId) : ""}
            onValueChange={(id) =>
              setValue((current) => ({ ...current, ledgerGroupId: Number(id) || 0 }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Ledger name" required>
          <Input
            autoFocus
            maxLength={200}
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Ledger active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save ledger"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save ledger
            </>
          )
        }}
      />
    </form>
  );
}
