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
import { productCategoriesSchema } from "./product-categories.schema";
import type {
  ProductCategoriesRecord,
  ProductCategoriesSavePayload
} from "./product-categories.types";

const emptyProductCategories: ProductCategoriesSavePayload = {
  name: "",
  isActive: true,
  sortOrder: 1000
};

export function ProductCategoriesForm({
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
  onSubmit: (payload: ProductCategoriesSavePayload) => void;
  open: boolean;
  record: ProductCategoriesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the product category details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} product category`}
    >
      <ProductCategoriesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyProductCategories}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function ProductCategoriesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: ProductCategoriesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: ProductCategoriesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = productCategoriesSchema.safeParse(value);
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
          ariaLabel="Product category active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save product category"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save product category
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: ProductCategoriesRecord): ProductCategoriesSavePayload {
  return { name: record.name, isActive: record.isActive, sortOrder: record.sortOrder };
}
