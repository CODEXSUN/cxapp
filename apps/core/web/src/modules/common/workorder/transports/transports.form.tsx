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
import { transportsSchema } from "./transports.schema";
import type { TransportsRecord, TransportsSavePayload } from "./transports.types";

const emptyTransports: TransportsSavePayload = {
  name: "",
  gst: "",
  vehicleNo: "",
  address: "",
  contactNo: "",
  contactPerson: "",
  isActive: true,
  sortOrder: 1000
};

export function TransportsForm({
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
  onSubmit: (payload: TransportsSavePayload) => void;
  open: boolean;
  record: TransportsRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the transport details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} transport`}
    >
      <TransportsFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyTransports}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function TransportsFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: TransportsSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: TransportsSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = transportsSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setValidationError("");
        onSubmit(value);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="Name">
          <Input
            autoFocus
            type="text"
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="GST">
          <Input
            type="text"
            value={value.gst ?? ""}
            onChange={(event) => setValue((current) => ({ ...current, gst: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Vehicle number">
          <Input
            type="text"
            value={value.vehicleNo ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, vehicleNo: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Address">
          <Input
            type="text"
            value={value.address ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, address: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Contact number">
          <Input
            type="text"
            value={value.contactNo ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, contactNo: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Contact person">
          <Input
            type="text"
            value={value.contactPerson ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, contactPerson: event.target.value }))
            }
          />
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
          ariaLabel="Transport active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save transport"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save transport
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: TransportsRecord): TransportsSavePayload {
  return {
    name: record.name,
    gst: record.gst,
    vehicleNo: record.vehicleNo,
    address: record.address,
    contactNo: record.contactNo,
    contactPerson: record.contactPerson,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
