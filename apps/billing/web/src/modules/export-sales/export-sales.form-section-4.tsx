import { Button } from "@cxapp/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { Input } from "@cxapp/ui/components/input";
import { Textarea } from "@cxapp/ui/components/textarea";
import { WorkspaceDatePicker } from "@cxapp/ui/workspace/date-picker";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspaceSelect } from "@cxapp/ui/workspace/select";
import { WorkspaceFormBanner } from "@cxapp/ui/workspace/upsert";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ContactQuickField } from "./export-sales.form-section-1";
import { exportSaleCommonOption } from "./export-sales.form-section-2";
import { ProductPopupLookup } from "./export-sales.form-section-5";
import {
  createExportSaleLookup,
  listExportSaleHsnCodes,
  listExportSaleProductCategories,
  listExportSaleTaxes,
  listExportSaleUnits,
  type ExportSaleLookupOption,
  type ExportSaleLookupRecord,
  type ExportSaleMasterSavePayload,
  type ExportSaleTransportSavePayload
} from "./export-sales.services";
import { type ExportSaleEinvoiceDetails, type ExportSaleEwayDetails } from "./export-sales.types";

export function ExportSaleTransportQuickForm({
  initialName,
  onCancel,
  onCreated,
  onSave
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (option: ExportSaleLookupOption) => void;
  onSave: (payload: ExportSaleTransportSavePayload) => Promise<ExportSaleLookupOption>;
}) {
  const [form, setForm] = useState<ExportSaleTransportSavePayload>({
    address: "",
    contactNo: "",
    contactPerson: "",
    gst: "",
    name: initialName,
    vehicleNo: ""
  });
  const update = (next: Partial<ExportSaleTransportSavePayload>) =>
    setForm((current) => ({ ...current, ...next }));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Transporter name" required>
        <Input value={form.name} onChange={(event) => update({ name: event.target.value })} />
      </Field>
      <Field label="Transporter GST">
        <Input
          value={form.gst}
          onChange={(event) => update({ gst: event.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="Vehicle no">
        <Input
          value={form.vehicleNo}
          onChange={(event) => update({ vehicleNo: event.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="Contact no">
        <Input
          value={form.contactNo}
          onChange={(event) => update({ contactNo: event.target.value })}
        />
      </Field>
      <Field label="Contact person">
        <Input
          value={form.contactPerson}
          onChange={(event) => update({ contactPerson: event.target.value })}
        />
      </Field>
      <Field label="Address">
        <Input value={form.address} onChange={(event) => update({ address: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!form.name.trim()}
          onClick={async () => onCreated(await onSave(form))}
        >
          <Save className="size-4" />
          Save transport
        </Button>
      </div>
    </div>
  );
}

export function ExportSaleEwayTab({
  loading,
  onChange,
  onCreateTransport,
  onGenerate,
  onTransportChange,
  options,
  selected,
  value
}: {
  loading: boolean;
  onChange: (next: Partial<ExportSaleEwayDetails>) => void;
  onCreateTransport: (
    payload: ExportSaleTransportSavePayload
  ) => Promise<{ description: string; label: string; meta: string; value: string }>;
  onGenerate: () => void;
  onTransportChange: (value: string, option?: ExportSaleLookupOption | null) => void;
  options: ExportSaleLookupOption[];
  selected: ExportSaleLookupOption | undefined;
  value: ExportSaleEwayDetails;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-3">
        <div className="text-sm text-muted-foreground">
          E-way status{" "}
          <span className="ml-2 rounded-sm bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
            {value.status === "generated" ? "Generated" : "Not generated"}
          </span>
        </div>
        <Button type="button" className="h-9 rounded-md" onClick={onGenerate}>
          <Send className="size-4" />
          Generate
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="E-way bill no">
          <Input
            value={value.billNo}
            onChange={(event) => onChange({ billNo: event.target.value })}
          />
        </Field>
        <Field label="E-way bill date">
          <WorkspaceDatePicker
            value={value.billDate}
            onValueChange={(billDate) => onChange({ billDate })}
          />
        </Field>
        <Field label="Transport">
          <WorkspaceLookup
            createDescription="Add transporter details without leaving this exportSale."
            createLabel="New transport"
            createMode="popup"
            createTitle="New transport"
            emptyLabel="No transport found. Create a new transport."
            loading={loading}
            options={options}
            placeholder="Search transport"
            value={value.transport}
            onTextChange={(next) => onChange({ transport: next })}
            onValueChange={onTransportChange}
            renderCreateForm={({ initialName, onCancel, onCreated }) => (
              <ExportSaleTransportQuickForm
                initialName={initialName}
                onCancel={onCancel}
                onCreated={onCreated}
                onSave={onCreateTransport}
              />
            )}
          />
          {value.transportGst || selected?.record?.gst ? (
            <div className="mt-1 text-xs text-muted-foreground">
              Transporter GST:{" "}
              <span className="font-medium text-foreground">
                {value.transportGst || selected?.record?.gst}
              </span>
            </div>
          ) : null}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="E-way part">
            <WorkspaceSelect
              value={value.part}
              options={[
                { label: "Part A", value: "Part A" },
                { label: "Part B", value: "Part B" }
              ]}
              onValueChange={(part) => onChange({ part: part as ExportSaleEwayDetails["part"] })}
            />
          </Field>
          <Field label="Vehicle no">
            <Input
              value={value.vehicleNo}
              onChange={(event) => onChange({ vehicleNo: event.target.value.toUpperCase() })}
            />
          </Field>
        </div>
      </div>
      <Field label="Transport / vehicle notes">
        <Textarea
          className="min-h-28"
          value={value.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </Field>
    </div>
  );
}

export function ExportSaleEinvoiceTab({
  onChange,
  onGenerate,
  value
}: {
  onChange: (next: Partial<ExportSaleEinvoiceDetails>) => void;
  onGenerate: () => void;
  value: ExportSaleEinvoiceDetails;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-3">
        <div className="text-sm text-muted-foreground">
          E-invoice status{" "}
          <span className="ml-2 rounded-sm bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
            {value.status === "generated" ? "Generated" : "Not generated"}
          </span>
        </div>
        <Button type="button" className="h-9 rounded-md" onClick={onGenerate}>
          <Send className="size-4" />
          Generate
        </Button>
      </div>
      <Field label="IRN">
        <Input
          value={value.irn}
          onChange={(event) => onChange({ irn: event.target.value.toUpperCase() })}
        />
      </Field>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Ack no">
          <Input
            value={value.ackNo}
            onChange={(event) => onChange({ ackNo: event.target.value })}
          />
        </Field>
        <Field label="Ack date">
          <WorkspaceDatePicker
            value={value.ackDate}
            onValueChange={(ackDate) => onChange({ ackDate })}
          />
        </Field>
      </div>
      <Field label="Signed QR">
        <Textarea
          className="min-h-28"
          value={value.signedQr}
          onChange={(event) => onChange({ signedQr: event.target.value })}
        />
      </Field>
    </div>
  );
}

export function Field({
  children,
  label,
  required
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-muted-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {children}
    </label>
  );
}

export function ExportSaleProductQuickForm({
  initialValue,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: ExportSaleMasterSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: ExportSaleMasterSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [validationError, setValidationError] = useState("");
  const categoriesQuery = useQuery({
    queryFn: listExportSaleProductCategories,
    queryKey: ["billing", "exportSale", "lookups", "product-categories"]
  });
  const hsnCodesQuery = useQuery({
    queryFn: listExportSaleHsnCodes,
    queryKey: ["billing", "exportSale", "lookups", "hsn-codes"]
  });
  const unitsQuery = useQuery({
    queryFn: listExportSaleUnits,
    queryKey: ["billing", "exportSale", "lookups", "units"]
  });
  const taxesQuery = useQuery({
    queryFn: listExportSaleTaxes,
    queryKey: ["billing", "exportSale", "lookups", "taxes"]
  });

  function patchProduct(next: Partial<ExportSaleMasterSavePayload>) {
    if (next.name !== undefined) setValidationError("");
    setForm((current) => ({ ...current, ...next }));
  }

  function submitProduct() {
    setSaveAttempted(true);
    if (!form.name.trim()) {
      setValidationError("Product name is required.");
      return;
    }
    const openingRate = String(form.openingRate).trim();
    if (openingRate && (!Number.isFinite(Number(openingRate)) || Number(openingRate) < 0)) {
      setValidationError("Opening price must be a valid non-negative decimal.");
      return;
    }
    setValidationError("");
    void onSave(form).catch((error: unknown) =>
      setValidationError(error instanceof Error ? error.message : "Unable to save product.")
    );
  }

  async function createOption(
    kind: "productCategories" | "hsnCodes" | "units" | "taxes",
    name: string
  ) {
    const value = name.trim();
    const taxRate = kind === "taxes" ? parseTaxRate(value) : null;
    if (kind === "taxes" && taxRate === null) {
      const error = new Error("Enter a valid non-negative GST tax rate.");
      setValidationError(error.message);
      throw error;
    }
    const payload =
      kind === "hsnCodes"
        ? { code: value.toUpperCase(), description: value, isActive: true }
        : kind === "taxes"
          ? {
              description: String(taxRate),
              isActive: true,
              ratePercent: taxRate
            }
          : { isActive: true, name: value };
    const created = await createExportSaleLookup(kind, payload).catch((error: unknown) => {
      setValidationError(
        error instanceof Error ? error.message : "Unable to create the selected lookup."
      );
      throw error;
    });
    const query = {
      productCategories: categoriesQuery,
      hsnCodes: hsnCodesQuery,
      units: unitsQuery,
      taxes: taxesQuery
    }[kind];
    await query.refetch();
    toast.success(
      `${kind === "productCategories" ? "Product category" : kind === "hsnCodes" ? "HSN code" : kind === "units" ? "Unit" : "GST tax rate"} saved`,
      { description: value }
    );
    return kind === "taxes" ? { ...created, name: taxRateLabel(created) } : created;
  }

  const categoryOptions = (categoriesQuery.data ?? []).map((record) => ({
    ...exportSaleCommonOption(record),
    value: String(record.id)
  }));
  const hsnOptions = (hsnCodesQuery.data ?? []).map((record) => ({
    ...exportSaleCommonOption(record),
    label: record.code || record.name || record.id,
    value: String(record.id)
  }));
  const unitOptions = (unitsQuery.data ?? []).map((record) => ({
    ...exportSaleCommonOption(record),
    value: String(record.id)
  }));
  const taxOptions = (taxesQuery.data ?? []).map((record) => ({
    ...exportSaleCommonOption(record),
    label: taxRateLabel(record),
    value: String(record.id)
  }));

  return (
    <form
      className="grid gap-0"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submitProduct();
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        {validationError ? (
          <WorkspaceFormBanner className="mb-0 sm:col-span-2" title="Unable to save product">
            {validationError}
          </WorkspaceFormBanner>
        ) : null}
        <ContactQuickField
          invalid={saveAttempted && !form.name.trim()}
          label="Product name"
          required
          value={form.name}
          onChange={(name) => patchProduct({ name })}
        />
        <ProductPopupLookup
          label="Product category"
          loading={categoriesQuery.isLoading}
          options={categoryOptions}
          value={form.productCategoryId || form.productCategoryName || ""}
          placeholder="Search product category"
          onCreate={(name) => createOption("productCategories", name)}
          onValueChange={(value, option) =>
            patchProduct({
              productCategoryId: option?.value ?? value,
              productCategoryName: option?.label ?? value
            })
          }
        />
        <ProductPopupLookup
          label="HSN code"
          loading={hsnCodesQuery.isLoading}
          options={hsnOptions}
          value={form.hsnCodeId || form.hsnCode || ""}
          placeholder="Search HSN code"
          onCreate={(name) => createOption("hsnCodes", name)}
          onValueChange={(value, option) =>
            patchProduct({ hsnCodeId: option?.value ?? value, hsnCode: option?.label ?? value })
          }
        />
        <ProductPopupLookup
          label="Units"
          loading={unitsQuery.isLoading}
          options={unitOptions}
          value={form.unitId || form.unitName || ""}
          placeholder="Search units"
          onCreate={(name) => createOption("units", name)}
          onValueChange={(value, option) =>
            patchProduct({ unitId: option?.value ?? value, unitName: option?.label ?? value })
          }
        />
        <ProductPopupLookup
          numericOnly
          label="GST tax rate"
          loading={taxesQuery.isLoading}
          options={taxOptions}
          value={form.taxId || (form.taxRate !== undefined ? String(form.taxRate) : "")}
          placeholder="Search GST tax rate"
          onCreate={(name) => createOption("taxes", name)}
          onValueChange={(value, option) => {
            const record = option?.record;
            patchProduct({
              taxId: option?.value ?? value,
              taxName: option?.label ?? value,
              taxRate: Number(record?.ratePercent ?? record?.taxRate ?? value) || 0
            });
          }}
        />
        <ContactQuickField
          inputMode="decimal"
          invalid={
            saveAttempted &&
            Boolean(
              String(form.openingRate).trim() &&
              (!Number.isFinite(Number(form.openingRate)) || Number(form.openingRate) < 0)
            )
          }
          label="Opening price"
          type="text"
          value={String(form.openingRate)}
          onChange={(openingRate) => patchProduct({ openingRate })}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          <Save className="size-4" />
          Save product
        </Button>
      </DialogFooter>
    </form>
  );
}

function parseTaxRate(value: string) {
  const parsed = Number(value.replace(/gst/gi, "").replace(/%/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function taxRateLabel(record: ExportSaleLookupRecord) {
  const rate = Number(record.ratePercent ?? record.taxRate);
  if (rate < 0 || record.description?.trim() === "-") return "-";
  return Number.isFinite(rate) ? `${rate}%` : "-";
}
