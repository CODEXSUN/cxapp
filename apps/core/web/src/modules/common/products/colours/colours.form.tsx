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
import { coloursSchema } from "./colours.schema";
import type { ColoursRecord, ColoursSavePayload } from "./colours.types";

const emptyColours: ColoursSavePayload = {
  name: "",
  isActive: true,
  sortOrder: 1000
};

export function ColoursForm({
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
  onSubmit: (payload: ColoursSavePayload) => void;
  open: boolean;
  record: ColoursRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the colour details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} colour`}
    >
      <ColoursFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyColours}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function ColoursFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: ColoursSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: ColoursSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  const pickerValue = toPickerValue(value.name);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = coloursSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setValidationError("");
        onSubmit(parsed.data);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Name or colour code" required>
          <Input
            autoFocus
            aria-invalid={Boolean(validationError && !value.name.trim())}
            placeholder="Black or #000000"
            type="text"
            value={value.name}
            onChange={(event) => {
              setValidationError("");
              setValue((current) => ({ ...current, name: event.target.value }));
            }}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Colour picker">
          <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-background px-2">
            <Input
              aria-label="Pick colour"
              className="h-8 w-14 cursor-pointer border-0 p-0 shadow-none"
              type="color"
              value={pickerValue}
              onChange={(event) => {
                setValidationError("");
                setValue((current) => ({ ...current, name: event.target.value }));
              }}
            />
            <span className="font-mono text-sm text-muted-foreground">{pickerValue}</span>
          </div>
        </WorkspaceFormField>
        <WorkspaceFormField label="Sort order">
          <Input
            min={0}
            type="number"
            value={value.sortOrder}
            onChange={(event) =>
              setValue((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Colour active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save colour"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save colour
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: ColoursRecord): ColoursSavePayload {
  return { name: record.name, isActive: record.isActive, sortOrder: record.sortOrder };
}

function toPickerValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized
      .slice(1)
      .split("")
      .map((character) => character.repeat(2))
      .join("")}`;
  }
  if (typeof document === "undefined" || !normalized) return "#000000";
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return "#000000";
  context.fillStyle = "#000001";
  context.fillStyle = normalized;
  return /^#[0-9a-f]{6}$/.test(context.fillStyle) && context.fillStyle !== "#000001"
    ? context.fillStyle
    : "#000000";
}
