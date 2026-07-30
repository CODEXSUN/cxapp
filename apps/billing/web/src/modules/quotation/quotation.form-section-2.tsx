import { Button } from "@cxapp/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { Save, X } from "lucide-react";
import { useState } from "react";
import { ContactQuickField } from "./quotation.form-section-1";
import { numericId } from "./quotation.form-section-4";
import {
  type QuotationContactSavePayload,
  type QuotationLocationKind,
  type QuotationLocationRecord,
  type QuotationLookupOption,
  type QuotationLookupRecord,
  type QuotationMasterSavePayload
} from "./quotation.services";

export function quotationLocationOption(record: QuotationLocationRecord): QuotationLookupOption {
  const label = record.name || record.pincode || record.code;
  return {
    label,
    record,
    value: String(record.id)
  };
}

export function locationPayload(
  kind: QuotationLocationKind,
  name: string,
  form: QuotationContactSavePayload
) {
  const trimmedName = name.trim();
  const payload: Record<string, unknown> = {
    code: locationCode(trimmedName),
    name: trimmedName,
    sortOrder: 1000,
    status: "active",
    countryId: numericId(form.countryId),
    countryName: form.countryName || "India"
  };
  if (kind !== "states") {
    payload.stateId = numericId(form.stateId);
    payload.stateName = form.stateName || null;
  }
  if (kind === "cities" || kind === "pincodes") {
    payload.districtId = numericId(form.districtId);
    payload.districtName = form.districtName || null;
  }
  if (kind === "pincodes") {
    payload.area = trimmedName;
    payload.cityId = numericId(form.cityId);
    payload.cityName = form.cityName || null;
    payload.pincode = trimmedName;
  }
  return payload;
}

export function locationPatch(
  kind: QuotationLocationKind,
  record: QuotationLocationRecord,
  form: QuotationContactSavePayload
): QuotationContactSavePayload {
  const label = record.pincode || record.name;
  const next = { ...form };
  if (kind === "states") {
    next.stateId = String(record.id);
    next.stateName = record.name;
    next.districtId = "";
    next.districtName = "";
    next.cityId = "";
    next.cityName = "";
    next.pincodeId = "";
    next.pincodeName = "";
  } else if (kind === "districts") {
    next.districtId = String(record.id);
    next.districtName = record.name;
    next.cityId = "";
    next.cityName = "";
    next.pincodeId = "";
    next.pincodeName = "";
  } else if (kind === "cities") {
    next.cityId = String(record.id);
    next.cityName = record.name;
    next.pincodeId = "";
    next.pincodeName = "";
  } else {
    next.pincodeId = String(record.id);
    next.pincodeName = label;
    next.cityId = record.cityId ? String(record.cityId) : next.cityId;
    next.cityName = record.cityName || next.cityName;
    next.districtId = record.districtId ? String(record.districtId) : next.districtId;
    next.districtName = record.districtName || next.districtName;
    next.stateId = record.stateId ? String(record.stateId) : next.stateId;
    next.stateName = record.stateName || next.stateName;
    next.countryId = record.countryId ? String(record.countryId) : next.countryId;
    next.countryName = record.countryName || next.countryName || "India";
  }
  return next;
}

export function locationCode(value: string) {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "LOCATION"
  );
}

export function contactDraftFromRecord(
  record?: QuotationLookupRecord,
  initialName = ""
): QuotationContactSavePayload {
  const address = record?.addresses?.[0] ?? {};
  return {
    addressTypeId: String(address.addressTypeId ?? ""),
    addressTypeName: String(address.addressTypeName ?? "Billing"),
    addressLine1: String(address.addressLine1 ?? ""),
    addressLine2: String(address.addressLine2 ?? ""),
    cityId: String(address.cityId ?? ""),
    cityName: String(address.cityName ?? ""),
    countryId: String(address.countryId ?? ""),
    countryName: String(address.countryName ?? "India"),
    districtId: String(address.districtId ?? ""),
    districtName: String(address.districtName ?? ""),
    gstin: String(record?.gstin ?? ""),
    legalName: record?.legalName ?? initialName,
    name: record?.name ?? initialName,
    pincodeId: String(address.pincodeId ?? ""),
    pincodeName: String(address.pincodeName ?? ""),
    primaryEmail: record?.primaryEmail ?? "",
    primaryPhone: record?.primaryPhone ?? "",
    stateId: String(address.stateId ?? ""),
    stateName: String(address.stateName ?? ""),
    typeId: String(record?.typeId ?? ""),
    typeName: String(record?.typeName ?? "Customer")
  };
}

export function quotationContactOption(record: QuotationLookupRecord): QuotationLookupOption {
  const label = record.name || record.code || record.id;
  return {
    description: record.primaryPhone || record.primaryEmail || "",
    label,
    meta: record.code || "",
    record,
    value: label
  };
}

export function quotationPersistedOption(record: QuotationLookupRecord): QuotationLookupOption {
  const label = record.name || record.code || record.id;
  return { label, record, value: String(record.id) };
}

export function QuotationMasterQuickForm({
  initialValue,
  kind,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: QuotationMasterSavePayload;
  kind: "products" | "workOrders";
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: QuotationMasterSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const product = kind === "products";
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
      <div className="grid gap-4 px-5 py-5">
        <ContactQuickField
          label={product ? "Product name" : "Work order name"}
          required
          value={form.name}
          onChange={(name) => setForm((current) => ({ ...current, name }))}
        />
        <ContactQuickField
          label="Code"
          value={form.code}
          onChange={(code) => setForm((current) => ({ ...current, code: code.toUpperCase() }))}
        />
        {product ? (
          <>
            <ContactQuickField
              label="HSN code"
              value={form.hsnCode}
              onChange={(hsnCode) => setForm((current) => ({ ...current, hsnCode }))}
            />
            <ContactQuickField
              label="Unit"
              value={form.unitName}
              onChange={(unitName) => setForm((current) => ({ ...current, unitName }))}
            />
            <ContactQuickField
              label="Opening rate"
              type="number"
              value={String(form.openingRate)}
              onChange={(openingRate) =>
                setForm((current) => ({ ...current, openingRate: Number(openingRate || 0) }))
              }
            />
          </>
        ) : (
          <ContactQuickField
            label="Work order type"
            value={form.typeName}
            onChange={(typeName) => setForm((current) => ({ ...current, typeName }))}
          />
        )}
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading || !form.name.trim()} type="submit">
          <Save className="size-4" />
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function masterDraftFromRecord(
  record?: QuotationLookupRecord,
  initialName = ""
): QuotationMasterSavePayload {
  return {
    code: record?.code ?? "",
    hsnCode: record?.hsnCode ?? "",
    hsnCodeId: record?.hsnCodeId ?? "",
    name: record?.name ?? initialName,
    openingRate: Number(record?.openingRate ?? record?.price ?? 0),
    productCategoryId: record?.productCategoryId ?? "",
    productCategoryName: record?.productCategoryName ?? "",
    taxId: record?.taxId ?? "",
    taxName: record?.taxName ?? "",
    taxRate: Number(record?.taxRate ?? record?.ratePercent ?? 0),
    typeName: record?.typeName ?? "",
    unitId: record?.unitId ?? "",
    unitName: record?.unitName ?? ""
  };
}

export function masterPayload(
  kind: "products" | "workOrders",
  payload: QuotationMasterSavePayload
) {
  return kind === "products"
    ? {
        code: payload.code.trim(),
        hsnCode: payload.hsnCode.trim(),
        hsnCodeId: numericId(payload.hsnCodeId),
        isActive: true,
        name: payload.name.trim(),
        openingRate: Number(payload.openingRate || 0),
        productCategoryId: numericId(payload.productCategoryId),
        productCategoryName: payload.productCategoryName?.trim() || null,
        taxId: numericId(payload.taxId),
        taxName: payload.taxName?.trim() || null,
        taxRate: Number(payload.taxRate || 0),
        unitId: numericId(payload.unitId),
        unitName: payload.unitName.trim()
      }
    : {
        code: payload.code.trim(),
        isActive: true,
        name: payload.name.trim(),
        typeName: payload.typeName.trim()
      };
}

export function quotationProductOption(record: QuotationLookupRecord): QuotationLookupOption {
  const label = record.name || record.code || record.id;
  return {
    description: [record.hsnCode, record.unitName].filter(Boolean).join(" | "),
    label,
    meta: record.code || "",
    record,
    value: label
  };
}

export function quotationWorkOrderOption(record: QuotationLookupRecord): QuotationLookupOption {
  const value = record.code || record.workOrderNo || record.name || record.id;
  return {
    description: record.name || record.typeName || "",
    label: value,
    meta: record.typeName || "",
    record,
    value
  };
}

export function quotationCommonOption(record: QuotationLookupRecord): QuotationLookupOption {
  const label = record.name || record.code || record.id;
  return { label, record, value: label };
}
