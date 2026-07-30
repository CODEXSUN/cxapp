import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Label } from "@codexsun/ui/components/label";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceFormBanner } from "@codexsun/ui/workspace/upsert";
import {
  createPaymentAddressType,
  createPaymentLocation,
  listPaymentAddressTypes,
  listPaymentContactTypes,
  listPaymentLocations
} from "./payment.services";
import type {
  PaymentContactSavePayload,
  PaymentLocationKind,
  PaymentLocationRecord,
  PaymentLookupOption,
  PaymentLookupRecord
} from "./payment.types";

export function PaymentContactDialog({
  initialValue,
  onCancel,
  onSave
}: {
  initialValue: PaymentContactSavePayload;
  onCancel: () => void;
  onSave: (payload: PaymentContactSavePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValue);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const types = useQuery({
    queryFn: listPaymentContactTypes,
    queryKey: ["billing", "payment", "lookups", "contact-types"]
  });
  const addressTypes = useQuery({
    queryFn: listPaymentAddressTypes,
    queryKey: ["billing", "payment", "lookups", "address-types"]
  });
  const countries = useQuery({
    queryFn: () => listPaymentLocations("countries"),
    queryKey: ["billing", "payment", "lookups", "countries"]
  });
  const states = useQuery({
    queryFn: () => listPaymentLocations("states"),
    queryKey: ["billing", "payment", "lookups", "states"]
  });
  const districts = useQuery({
    queryFn: () => listPaymentLocations("districts"),
    queryKey: ["billing", "payment", "lookups", "districts"]
  });
  const cities = useQuery({
    queryFn: () => listPaymentLocations("cities"),
    queryKey: ["billing", "payment", "lookups", "cities"]
  });
  const pincodes = useQuery({
    queryFn: () => listPaymentLocations("pincodes"),
    queryKey: ["billing", "payment", "lookups", "pincodes"]
  });

  useEffect(() => {
    const supplier = (types.data ?? []).find(
      (option) => option.label.trim().toLowerCase() === "supplier"
    );
    if (!supplier || form.typeId) return;
    setForm((current) => ({ ...current, typeId: supplier.value, typeName: supplier.label }));
  }, [form.typeId, types.data]);
  useEffect(() => {
    const india = (countries.data ?? []).find(
      (record) => record.name.toLowerCase() === "india" || record.code.toUpperCase() === "IN"
    );
    if (!india || form.countryId) return;
    setForm((current) => ({ ...current, countryId: india.id, countryName: india.name }));
  }, [countries.data, form.countryId]);
  useEffect(() => {
    if (form.addressTypeId) return;
    const match = (addressTypes.data ?? []).find(
      (record) => record.name?.trim().toLowerCase() === form.addressTypeName.toLowerCase()
    );
    if (match) setForm((current) => ({ ...current, addressTypeId: String(match.id) }));
  }, [addressTypes.data, form.addressTypeId, form.addressTypeName]);

  async function createLocation(kind: PaymentLocationKind, name: string) {
    const dependency =
      kind === "states"
        ? form.countryId
        : kind === "districts"
          ? form.stateId
          : kind === "cities"
            ? form.districtId
            : form.cityId;
    if (!dependency) {
      toast.error(
        `Select ${kind === "states" ? "India" : kind === "districts" ? "a state" : kind === "cities" ? "a district" : "a city"} first.`
      );
      return undefined;
    }
    const created = await createPaymentLocation(kind, locationPayload(kind, name, form));
    await { cities, districts, pincodes, states }[kind].refetch();
    toast.success(`${kind === "pincodes" ? "Pincode" : kind.slice(0, -1)} saved`, {
      description: name
    });
    return locationOption(created);
  }

  const tabs: WorkspaceAnimatedTab[] = [
    {
      label: "Details",
      value: "details",
      content: (
        <div className="grid gap-4">
          <ContactField
            autoFocus
            label="Contact name"
            required
            value={form.name}
            onChange={(name) =>
              setForm((current) => ({ ...current, legalName: name.toUpperCase(), name }))
            }
          />
          <ContactField
            uppercase
            label="Legal name"
            value={form.legalName}
            onChange={(legalName) => setForm((current) => ({ ...current, legalName }))}
          />
          <ContactField
            uppercase
            label="GSTIN"
            value={form.gstin}
            onChange={(gstin) => setForm((current) => ({ ...current, gstin }))}
          />
          <ContactField
            label="Phone"
            value={form.primaryPhone}
            onChange={(primaryPhone) => setForm((current) => ({ ...current, primaryPhone }))}
          />
          <ContactField
            label="Email"
            type="email"
            value={form.primaryEmail}
            onChange={(primaryEmail) => setForm((current) => ({ ...current, primaryEmail }))}
          />
        </div>
      )
    },
    {
      label: "Address",
      value: "address",
      content: (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <Label>Address type</Label>
            <WorkspaceLookup
              createLabel="Save address type"
              createMode="inline"
              loading={addressTypes.isLoading}
              options={(addressTypes.data ?? [])
                .filter((record) => record.isActive !== false)
                .map(persistedOption)}
              placeholder="Search address type"
              value={form.addressTypeId || form.addressTypeName}
              onCreate={async (name) => {
                const created = await createPaymentAddressType(name);
                await addressTypes.refetch();
                toast.success("Address type saved", { description: name });
                return persistedOption(created);
              }}
              onValueChange={(value, option) =>
                setForm((current) => ({
                  ...current,
                  addressTypeId: option ? value : "",
                  addressTypeName: option?.label ?? value
                }))
              }
            />
          </label>
          <ContactField
            label="Address line 1"
            value={form.addressLine1}
            onChange={(addressLine1) => setForm((current) => ({ ...current, addressLine1 }))}
          />
          <ContactField
            label="Address line 2"
            value={form.addressLine2}
            onChange={(addressLine2) => setForm((current) => ({ ...current, addressLine2 }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <Label>Country</Label>
              <WorkspaceLookup
                allowTextValue={false}
                emptyLabel="No country found."
                loading={countries.isLoading}
                options={(countries.data ?? [])
                  .filter((record) => record.status !== "inactive")
                  .map(locationOption)}
                placeholder="Search country"
                value={
                  form.countryId ||
                  String(
                    (countries.data ?? []).find(
                      (record) => record.name.toLowerCase() === form.countryName.toLowerCase()
                    )?.id ?? ""
                  )
                }
                onValueChange={(selected, option) => {
                  const record =
                    ((option as PaymentLookupOption | undefined)?.record as
                      PaymentLocationRecord | undefined) ??
                    (countries.data ?? []).find((item) => item.id === selected);
                  if (!record) return;
                  setForm((current) => ({
                    ...current,
                    countryId: record.id,
                    countryName: record.name,
                    stateId: "",
                    stateName: "",
                    districtId: "",
                    districtName: "",
                    cityId: "",
                    cityName: "",
                    pincodeId: "",
                    pincodeName: ""
                  }));
                }}
              />
            </label>
            <LocationLookup
              kind="states"
              label="State"
              loading={states.isLoading}
              options={(states.data ?? []).filter(
                (record) => !form.countryId || record.countryId === form.countryId
              )}
              value={form.stateId || form.stateName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("states", record, current))}
            />
            <LocationLookup
              kind="districts"
              label="District"
              loading={districts.isLoading}
              options={(districts.data ?? []).filter(
                (record) => !form.stateId || record.stateId === form.stateId
              )}
              value={form.districtId || form.districtName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("districts", record, current))}
            />
            <LocationLookup
              kind="cities"
              label="City"
              loading={cities.isLoading}
              options={(cities.data ?? []).filter(
                (record) => !form.districtId || record.districtId === form.districtId
              )}
              value={form.cityId || form.cityName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("cities", record, current))}
            />
            <LocationLookup
              kind="pincodes"
              label="Pincode"
              loading={pincodes.isLoading}
              options={(pincodes.data ?? []).filter(
                (record) => !form.cityId || record.cityId === form.cityId
              )}
              value={form.pincodeId || form.pincodeName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("pincodes", record, current))}
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!form.name.trim() || !form.typeId) return;
        setSaving(true);
        setError("");
        void onSave(form)
          .catch((reason: unknown) =>
            setError(reason instanceof Error ? reason.message : "Contact could not be saved.")
          )
          .finally(() => setSaving(false));
      }}
    >
      <DialogHeader className="border-b px-5 py-4 pr-12">
        <DialogTitle>New contact</DialogTitle>
      </DialogHeader>
      {error ? (
        <div className="px-5 pt-4">
          <WorkspaceFormBanner title="Contact could not be saved">{error}</WorkspaceFormBanner>
        </div>
      ) : null}
      <WorkspaceAnimatedTabs
        contentClassName="h-[26rem] overflow-y-auto px-5 pb-5"
        listClassName="rounded-none border-x-0 border-t-0 px-5 shadow-none"
        tabs={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
      />
      <DialogFooter className="border-t px-5 py-4">
        <Button disabled={saving} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" /> Cancel
        </Button>
        <Button disabled={saving || !form.name.trim() || !form.typeId} type="submit">
          <Save className="size-4" /> {saving ? "Saving..." : "Save contact"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ContactField({
  autoFocus,
  label,
  onChange,
  required,
  type,
  uppercase,
  value
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  uppercase?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        autoFocus={autoFocus}
        className={uppercase ? "uppercase" : undefined}
        type={type}
        value={value}
        onChange={(event) =>
          onChange(uppercase ? event.target.value.toUpperCase() : event.target.value)
        }
      />
    </label>
  );
}

function LocationLookup({
  kind,
  label,
  loading,
  onCreate,
  onPick,
  options,
  value
}: {
  kind: PaymentLocationKind;
  label: string;
  loading: boolean;
  onCreate: (kind: PaymentLocationKind, name: string) => Promise<PaymentLookupOption | undefined>;
  onPick: (record: PaymentLocationRecord) => void;
  options: PaymentLocationRecord[];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <WorkspaceLookup
        allowTextValue={false}
        createLabel={`Create ${label.toLowerCase()}`}
        createMode="inline"
        loading={loading}
        options={options.filter((record) => record.status !== "inactive").map(locationOption)}
        placeholder={`Search ${label.toLowerCase()}`}
        value={value}
        onCreate={(name) => onCreate(kind, name)}
        onValueChange={(selected, option) => {
          const record =
            ((option as PaymentLookupOption | undefined)?.record as
              PaymentLocationRecord | undefined) ?? options.find((item) => item.id === selected);
          if (record) onPick(record);
        }}
      />
    </label>
  );
}

function locationOption(record: PaymentLocationRecord): PaymentLookupOption {
  return {
    label: record.name || record.pincode || record.code,
    record: record as PaymentLookupRecord,
    value: record.id
  };
}
function persistedOption(record: PaymentLookupRecord): PaymentLookupOption {
  return { label: record.name || record.code || record.id, record, value: String(record.id) };
}
function locationPayload(kind: PaymentLocationKind, name: string, form: PaymentContactSavePayload) {
  const value = name.trim();
  const payload: Record<string, unknown> = {
    code: locationCode(value),
    countryId: numericId(form.countryId),
    countryName: form.countryName || "India",
    name: value,
    sortOrder: 1000,
    status: "active"
  };
  if (kind !== "states")
    Object.assign(payload, { stateId: numericId(form.stateId), stateName: form.stateName || null });
  if (kind === "cities" || kind === "pincodes")
    Object.assign(payload, {
      districtId: numericId(form.districtId),
      districtName: form.districtName || null
    });
  if (kind === "pincodes")
    Object.assign(payload, {
      area: value,
      cityId: numericId(form.cityId),
      cityName: form.cityName || null,
      pincode: value
    });
  return payload;
}
function locationPatch(
  kind: PaymentLocationKind,
  record: PaymentLocationRecord,
  form: PaymentContactSavePayload
) {
  const next = { ...form };
  if (kind === "states")
    Object.assign(next, {
      stateId: record.id,
      stateName: record.name,
      districtId: "",
      districtName: "",
      cityId: "",
      cityName: "",
      pincodeId: "",
      pincodeName: ""
    });
  else if (kind === "districts")
    Object.assign(next, {
      districtId: record.id,
      districtName: record.name,
      cityId: "",
      cityName: "",
      pincodeId: "",
      pincodeName: ""
    });
  else if (kind === "cities")
    Object.assign(next, {
      cityId: record.id,
      cityName: record.name,
      pincodeId: "",
      pincodeName: ""
    });
  else
    Object.assign(next, {
      pincodeId: record.id,
      pincodeName: record.pincode || record.name,
      cityId: record.cityId || next.cityId,
      cityName: record.cityName || next.cityName,
      districtId: record.districtId || next.districtId,
      districtName: record.districtName || next.districtName,
      stateId: record.stateId || next.stateId,
      stateName: record.stateName || next.stateName,
      countryId: record.countryId || next.countryId,
      countryName: record.countryName || next.countryName || "India"
    });
  return next;
}
function numericId(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function locationCode(value: string) {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "LOCATION"
  );
}

export function emptyPaymentContact(name: string): PaymentContactSavePayload {
  return {
    addressLine1: "",
    addressLine2: "",
    addressTypeId: "",
    addressTypeName: "Billing",
    cityId: "",
    cityName: "",
    countryId: "",
    countryName: "India",
    districtId: "",
    districtName: "",
    gstin: "",
    legalName: name.trim().toUpperCase(),
    name: name.trim(),
    pincodeId: "",
    pincodeName: "",
    primaryEmail: "",
    primaryPhone: "",
    stateId: "",
    stateName: "",
    typeId: "",
    typeName: "Supplier"
  };
}
