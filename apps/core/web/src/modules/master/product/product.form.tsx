import { useState } from "react";
import { ArrowLeft, Plus, Save, X } from "lucide-react";
import type { WorkspaceLookupOption } from "@codexsun/ui/workspace/lookup";
import { Button } from "@codexsun/ui/components/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@codexsun/ui/workspace/upsert";
import { productSchema } from "./product.schema";
import type {
  ProductLookupCreate,
  ProductLookups,
  ProductRecord,
  ProductSavePayload
} from "./product.types";

export function ProductForm({
  createLookup,
  error,
  loading,
  lookups,
  lookupsLoading,
  onBack,
  onSubmit,
  record
}: {
  createLookup: ProductLookupCreate;
  error: string;
  loading: boolean;
  lookups: ProductLookups;
  lookupsLoading: boolean;
  onBack: () => void;
  onSubmit: (payload: ProductSavePayload) => void;
  record: ProductRecord | null;
}) {
  const [validationError, setValidationError] = useState("");
  const [form, setForm] = useState<ProductSavePayload>(() =>
    record
      ? { ...record }
      : {
          name: "",
          typeId: null,
          productCategoryId: null,
          hsnCodeId: null,
          unitId: null,
          taxId: null,
          openingRate: 0,
          openingStock: 0,
          isActive: true,
          status: "active"
        }
  );
  const field = <Key extends keyof ProductSavePayload>(key: Key, value: ProductSavePayload[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{record ? "Edit Product" : "New Product"}</h1>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
      <WorkspaceFormSurface>
        <WorkspaceFormBody>
          <WorkspaceFormGrid columns={2}>
            <Text
              label="Product name"
              value={form.name}
              onChange={(value) => field("name", value)}
            />
            <LookupField
              createLabel="Create product type"
              loading={lookupsLoading}
              options={namedOptions(lookups.productTypes)}
              placeholder="Search product type"
              value={form.typeId}
              onCreate={async (name) => toNamedOption(await createLookup.productType(name))}
              onValueChange={(value) => field("typeId", numberOrNull(value))}
            />
            <LookupField
              createLabel="Create category"
              label="Product category"
              loading={lookupsLoading}
              options={namedOptions(lookups.productCategories)}
              placeholder="Search product category"
              value={form.productCategoryId}
              onCreate={async (name) => toNamedOption(await createLookup.productCategory(name))}
              onValueChange={(value) => field("productCategoryId", numberOrNull(value))}
            />
            <WorkspaceFormField label="HSN code">
              <WorkspaceLookup
                createDialogClassName="sm:max-w-lg"
                createLabel="Create HSN code"
                createMode="popup"
                loading={lookupsLoading}
                options={lookups.hsnCodes.map((item) => ({
                  description: item.description,
                  label: item.code,
                  value: String(item.id)
                }))}
                placeholder="Search HSN code"
                value={form.hsnCodeId ? String(form.hsnCodeId) : ""}
                renderCreateForm={({ initialName, onCancel, onCreated }) => (
                  <ReferenceCreateForm
                    initialName={initialName}
                    nameLabel="HSN code"
                    secondaryLabel="Description"
                    title="Create HSN code"
                    onCancel={onCancel}
                    onCreate={async (code, description) => {
                      const created = await createLookup.hsnCode(code, description);
                      onCreated({
                        description: created.description,
                        label: created.code,
                        value: String(created.id)
                      });
                    }}
                  />
                )}
                onValueChange={(value) => field("hsnCodeId", numberOrNull(value))}
              />
            </WorkspaceFormField>
            <LookupField
              createLabel="Create unit"
              label="Unit"
              loading={lookupsLoading}
              options={namedOptions(lookups.units)}
              placeholder="Search unit"
              value={form.unitId}
              onCreate={async (name) => toNamedOption(await createLookup.unit(name))}
              onValueChange={(value) => field("unitId", numberOrNull(value))}
            />
            <WorkspaceFormField label="GST tax">
              <WorkspaceLookup
                createDialogClassName="sm:max-w-lg"
                createLabel="Create GST tax"
                createMode="popup"
                loading={lookupsLoading}
                options={lookups.taxes.map((item) => ({
                  description: item.description,
                  label: `${item.ratePercent}%`,
                  meta: "GST",
                  value: String(item.id)
                }))}
                placeholder="Search GST tax"
                value={form.taxId ? String(form.taxId) : ""}
                renderCreateForm={({ initialName, onCancel, onCreated }) => (
                  <ReferenceCreateForm
                    initialName={initialName.replace(/%/g, "")}
                    inputType="number"
                    nameLabel="Tax rate (%)"
                    secondaryLabel="Description"
                    title="Create GST tax"
                    onCancel={onCancel}
                    onCreate={async (rate, description) => {
                      const created = await createLookup.tax(Number(rate), description);
                      onCreated({
                        description: created.description,
                        label: `${created.ratePercent}%`,
                        meta: "GST",
                        value: String(created.id)
                      });
                    }}
                  />
                )}
                onValueChange={(value) => field("taxId", numberOrNull(value))}
              />
            </WorkspaceFormField>
            <NumberField
              label="Opening quantity"
              value={form.openingStock}
              onChange={(value) => field("openingStock", value ?? 0)}
            />
            <NumberField
              label="Opening price"
              value={form.openingRate}
              onChange={(value) => field("openingRate", value ?? 0)}
            />
            <WorkspaceFormField className="md:col-span-2" label="Status">
              <ToggleRow
                checked={form.isActive !== false}
                label={form.isActive !== false ? "Active" : "Suspended"}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    isActive: checked,
                    status: checked ? "active" : "suspend"
                  }))
                }
              />
            </WorkspaceFormField>
          </WorkspaceFormGrid>
          {validationError || error ? (
            <WorkspaceFormBanner title="Unable to save">
              {validationError || error}
            </WorkspaceFormBanner>
          ) : null}
        </WorkspaceFormBody>
        <WorkspaceFormActions>
          <Button
            disabled={loading || !form.name.trim()}
            onClick={() => {
              const result = productSchema.safeParse(form);
              if (!result.success) {
                setValidationError(result.error.issues[0]?.message ?? "Check the product details.");
                return;
              }
              setValidationError("");
              onSubmit(form);
            }}
          >
            <Save className="size-4" />
            Save
          </Button>
          <Button variant="outline" onClick={onBack}>
            <X className="size-4" />
            Cancel
          </Button>
        </WorkspaceFormActions>
      </WorkspaceFormSurface>
    </section>
  );
}

function LookupField({
  createLabel,
  label = "Product type",
  loading,
  onCreate,
  onValueChange,
  options,
  placeholder,
  value
}: {
  createLabel: string;
  label?: string;
  loading: boolean;
  onCreate: (name: string) => Promise<WorkspaceLookupOption>;
  onValueChange: (value: string) => void;
  options: WorkspaceLookupOption[];
  placeholder: string;
  value: number | null | undefined;
}) {
  return (
    <WorkspaceFormField label={label}>
      <WorkspaceLookup
        createLabel={createLabel}
        createMode="inline"
        loading={loading}
        options={options}
        placeholder={placeholder}
        value={value ? String(value) : ""}
        onCreate={onCreate}
        onValueChange={onValueChange}
      />
    </WorkspaceFormField>
  );
}

function ReferenceCreateForm({
  initialName,
  inputType = "text",
  nameLabel,
  onCancel,
  onCreate,
  secondaryLabel,
  title
}: {
  initialName: string;
  inputType?: "number" | "text";
  nameLabel: string;
  onCancel: () => void;
  onCreate: (name: string, secondary: string) => Promise<void>;
  secondaryLabel: string;
  title: string;
}) {
  const [name, setName] = useState(initialName);
  const [secondary, setSecondary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        void onCreate(name.trim(), secondary.trim())
          .catch((reason: unknown) =>
            setError(reason instanceof Error ? reason.message : "Unable to create record.")
          )
          .finally(() => setSaving(false));
      }}
    >
      <DialogHeader className="border-b px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Create and select this record without leaving Product.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 px-5 py-5">
        <WorkspaceFormField label={nameLabel} required>
          <Input
            autoFocus
            type={inputType}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label={secondaryLabel} required>
          <Input value={secondary} onChange={(event) => setSecondary(event.target.value)} />
        </WorkspaceFormField>
        {error ? (
          <WorkspaceFormBanner title={`Unable to ${title.toLowerCase()}`}>
            {error}
          </WorkspaceFormBanner>
        ) : null}
      </div>
      <DialogFooter className="border-t px-5 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" /> Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            saving ||
            !name.trim() ||
            !secondary.trim() ||
            (inputType === "number" && !Number.isFinite(Number(name)))
          }
        >
          <Plus className="size-4" /> Create
        </Button>
      </DialogFooter>
    </form>
  );
}

function Text({
  label,
  value,
  onChange
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  return (
    <WorkspaceFormField label={label} required>
      <Input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
    </WorkspaceFormField>
  );
}
function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: unknown;
  onChange: (value: number | null) => void;
}) {
  return (
    <WorkspaceFormField label={label}>
      <Input
        type="number"
        value={value == null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      />
    </WorkspaceFormField>
  );
}
function ToggleRow({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return <WorkspaceSwitchCard checked={checked} label={label} onCheckedChange={onCheckedChange} />;
}
function namedOptions(items: Array<{ id: number; name: string }>) {
  return items.map(toNamedOption);
}
function toNamedOption(item: { id: number; name: string }): WorkspaceLookupOption {
  return { label: item.name, value: String(item.id) };
}
function numberOrNull(value: string) {
  return value ? Number(value) : null;
}
