import { Button } from "@cxapp/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { WorkspaceFormBanner } from "@cxapp/ui/workspace/upsert";
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

export function QuotationWorkOrderQuickForm({
  initialValue,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: QuotationMasterSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: QuotationMasterSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState("");
  const nameMissing = !form.name.trim();
  const codeMissing = !form.code.trim();
  return (
    <form
      className="grid gap-0"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSaveAttempted(true);
        if (nameMissing || codeMissing) {
          setSaveError(
            nameMissing && codeMissing
              ? "Work order name and code are required."
              : nameMissing
                ? "Work order name is required."
                : "Work order code is required."
          );
          return;
        }
        setSaveError("");
        void onSave(form).catch((error: unknown) => {
          setSaveError(error instanceof Error ? error.message : "Unable to save work order.");
        });
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 px-5 py-5">
        {saveError ? (
          <WorkspaceFormBanner className="mb-0" title="Unable to save work order">
            {saveError}
          </WorkspaceFormBanner>
        ) : null}
        <ContactQuickField
          invalid={saveAttempted && nameMissing}
          label="Work order name"
          required
          value={form.name}
          onChange={(name) => setForm((current) => ({ ...current, name }))}
        />
        <ContactQuickField
          invalid={saveAttempted && codeMissing}
          label="Code"
          required
          value={form.code}
          onChange={(code) => setForm((current) => ({ ...current, code: code.toUpperCase() }))}
        />
        <ContactQuickField
          label="Work order type"
          value={form.typeName}
          onChange={(typeName) => setForm((current) => ({ ...current, typeName }))}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
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
    openingRate:
      record?.openingRate !== undefined || record?.price !== undefined
        ? String(record.openingRate ?? record.price ?? "")
        : "",
    productCategoryId: record?.productCategoryId ?? "",
    productCategoryName: record?.productCategoryName ?? "",
    taxId: record?.taxId ?? "",
    taxName: record?.taxName ?? "",
    taxRate:
      record?.taxRate !== undefined || record?.ratePercent !== undefined
        ? Number(record.taxRate ?? record.ratePercent)
        : undefined,
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
        hsnCodeId: numericId(payload.hsnCodeId),
        isActive: true,
        name: payload.name.trim(),
        openingRate: Number(payload.openingRate || 0),
        productCategoryId: numericId(payload.productCategoryId),
        taxId: numericId(payload.taxId),
        unitId: numericId(payload.unitId)
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
