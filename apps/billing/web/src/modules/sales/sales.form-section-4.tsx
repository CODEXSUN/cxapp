import { Button } from "@codexsun/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Textarea } from "@codexsun/ui/components/textarea";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ContactQuickField } from "./sales.form-section-1";
import { saleCommonOption } from "./sales.form-section-2";
import { ProductPopupLookup } from "./sales.form-section-5";
import {
  createSaleLookup,
  listSaleHsnCodes,
  listSaleProductCategories,
  listSaleTaxes,
  listSaleUnits,
  type SaleLookupOption,
  type SaleMasterSavePayload,
  type SaleTransportSavePayload
} from "./sales.services";
import { type SaleEinvoiceDetails, type SaleEwayDetails } from "./sales.types";

export function SaleTransportQuickForm({
  initialName,
  onCancel,
  onCreated,
  onSave
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (option: SaleLookupOption) => void;
  onSave: (payload: SaleTransportSavePayload) => Promise<SaleLookupOption>;
}) {
  const [form, setForm] = useState<SaleTransportSavePayload>({
    address: "",
    contactNo: "",
    contactPerson: "",
    gst: "",
    name: initialName,
    vehicleNo: ""
  });
  const update = (next: Partial<SaleTransportSavePayload>) =>
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

export function SaleEwayTab({
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
  onChange: (next: Partial<SaleEwayDetails>) => void;
  onCreateTransport: (
    payload: SaleTransportSavePayload
  ) => Promise<{ description: string; label: string; meta: string; value: string }>;
  onGenerate: () => void;
  onTransportChange: (value: string, option?: SaleLookupOption | null) => void;
  options: SaleLookupOption[];
  selected: SaleLookupOption | undefined;
  value: SaleEwayDetails;
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
            createDescription="Add transporter details without leaving this sale."
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
              <SaleTransportQuickForm
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
              onValueChange={(part) => onChange({ part: part as SaleEwayDetails["part"] })}
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

export function SaleEinvoiceTab({
  onChange,
  onGenerate,
  value
}: {
  onChange: (next: Partial<SaleEinvoiceDetails>) => void;
  onGenerate: () => void;
  value: SaleEinvoiceDetails;
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

export function SaleProductQuickForm({
  initialValue,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: SaleMasterSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: SaleMasterSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const categoriesQuery = useQuery({
    queryFn: listSaleProductCategories,
    queryKey: ["billing", "sale", "lookups", "product-categories"]
  });
  const hsnCodesQuery = useQuery({
    queryFn: listSaleHsnCodes,
    queryKey: ["billing", "sale", "lookups", "hsn-codes"]
  });
  const unitsQuery = useQuery({
    queryFn: listSaleUnits,
    queryKey: ["billing", "sale", "lookups", "units"]
  });
  const taxesQuery = useQuery({
    queryFn: listSaleTaxes,
    queryKey: ["billing", "sale", "lookups", "taxes"]
  });

  function patchProduct(next: Partial<SaleMasterSavePayload>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function createOption(
    kind: "productCategories" | "hsnCodes" | "units" | "taxes",
    name: string
  ) {
    const value = name.trim();
    const payload =
      kind === "hsnCodes"
        ? { code: value.toUpperCase(), description: value, isActive: true }
        : kind === "taxes"
          ? {
              description: `GST ${Number(value.replace(/%/g, "")) || 0}%`,
              isActive: true,
              ratePercent: Number(value.replace(/%/g, "")) || 0
            }
          : { isActive: true, name: value };
    const created = await createSaleLookup(kind, payload);
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
    return created;
  }

  const categoryOptions = (categoriesQuery.data ?? []).map(saleCommonOption);
  const hsnOptions = (hsnCodesQuery.data ?? []).map((record) => ({
    ...saleCommonOption(record),
    label: record.code || record.name || record.id,
    value: record.id
  }));
  const unitOptions = (unitsQuery.data ?? []).map(saleCommonOption);
  const taxOptions = (taxesQuery.data ?? []).map((record) => ({
    ...saleCommonOption(record),
    label: record.name || record.code || `${record.ratePercent ?? record.taxRate ?? 0}%`,
    value: record.id
  }));

  return (
    <form
      className="grid gap-0"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(form);
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        <ContactQuickField
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
          label="Opening price"
          type="number"
          value={String(form.openingRate)}
          onChange={(openingRate) => patchProduct({ openingRate: Number(openingRate || 0) })}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading || !form.name.trim()} type="submit">
          <Save className="size-4" />
          Save product
        </Button>
      </DialogFooter>
    </form>
  );
}
