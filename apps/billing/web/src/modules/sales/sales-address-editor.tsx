import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { Label } from "@codexsun/ui/components/label";
import { DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/dialog";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import {
  createSaleAddressType,
  createSaleLocation,
  listSaleAddressTypes,
  listSaleLocations,
  type SaleContactAddressSavePayload,
  type SaleLocationKind,
  type SaleLocationRecord,
  type SaleLookupOption,
  type SaleLookupRecord
} from "./sales.services";

export type SaleAddressDraft = SaleContactAddressSavePayload;

export type SaleAddressChoice = {
  addressId: number;
  description: string;
  draft: SaleAddressDraft;
  label: string;
  value: string;
};

export function saleAddressDraftFromText(value: string, addressTypeName: string): SaleAddressDraft {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    addressTypeId: "",
    addressLine1: lines[0] ?? "",
    addressLine2: lines.slice(1).join(", "),
    addressTypeName,
    cityId: "",
    cityName: "",
    countryId: "",
    countryName: "India",
    districtId: "",
    districtName: "",
    pincodeId: "",
    pincodeName: "",
    stateId: "",
    stateName: ""
  };
}

export function formatSaleAddress(draft: SaleAddressDraft) {
  return [
    draft.addressLine1.trim(),
    draft.addressLine2.trim(),
    [draft.cityName.trim(), draft.districtName.trim()].filter(Boolean).join(", "),
    [draft.stateName.trim(), draft.pincodeName.trim()].filter(Boolean).join(" - "),
    draft.countryName.trim()
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function buildSaleAddressChoices(record?: SaleLookupRecord | null) {
  return (record?.addresses ?? []).map((address, index) => {
    const draft = saleAddressDraftFromRecord(
      address,
      index === 0 ? "Billing" : `Address ${index + 1}`
    );
    return {
      addressId: Number(address.id ?? 0),
      description: formatSaleAddress(draft),
      draft,
      label: draft.addressTypeName || `Address ${index + 1}`,
      value: String(address.id ?? `${draft.addressTypeName || "address"}-${index}`)
    } satisfies SaleAddressChoice;
  });
}

export function findPreferredSaleAddress(
  choices: SaleAddressChoice[],
  preferred: "Billing" | "Shipping"
) {
  const exact = choices.find(
    (choice) => choice.draft.addressTypeName.toLowerCase() === preferred.toLowerCase()
  );
  if (exact) return exact;
  const match = choices.find((choice) =>
    choice.draft.addressTypeName.toLowerCase().includes(preferred.toLowerCase())
  );
  return match ?? choices[0];
}

export function SaleAddressField({
  choices,
  description,
  disabled,
  label,
  onEdit,
  onSelect,
  selectedValue
}: {
  choices: SaleAddressChoice[];
  description: string;
  disabled?: boolean;
  label: string;
  onEdit: () => void;
  onSelect: (choice: SaleAddressChoice) => void;
  selectedValue: string;
}) {
  const options = choices.map((choice) => ({
    description: choice.description || "No address lines saved.",
    label: choice.label,
    value: choice.value
  }));

  return (
    <div className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-4">
      <div className="flex items-end gap-3">
        <label className="grid flex-1 gap-2">
          <Label>{label}</Label>
          <WorkspaceLookup
            allowTextValue={false}
            emptyLabel={
              disabled ? "Select customer first." : "No saved addresses found on this contact."
            }
            options={options}
            placeholder={disabled ? "Search customer first" : `Search ${label.toLowerCase()}`}
            value={selectedValue}
            {...(disabled !== undefined ? { disabled } : {})}
            onValueChange={(value) => {
              const choice = choices.find((item) => item.value === value);
              if (choice) onSelect(choice);
            }}
          />
        </label>
        <Button
          aria-label={`Edit ${label.toLowerCase()} address`}
          className="size-11 rounded-md p-0"
          title={`Edit ${label.toLowerCase()} address`}
          type="button"
          variant="outline"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <div className="min-h-28 whitespace-pre-wrap rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-sm text-foreground">
        {description || "No address selected."}
      </div>
    </div>
  );
}

export function SaleAddressDialog({
  draft,
  loading,
  onCancel,
  onSave,
  title
}: {
  draft: SaleAddressDraft;
  loading?: boolean;
  onCancel: () => void;
  onSave: (draft: SaleAddressDraft) => void;
  title: string;
}) {
  const [form, setForm] = useState(draft);
  const [activeTab, setActiveTab] = useState("address");
  const addressTypesQuery = useQuery({
    queryFn: listSaleAddressTypes,
    queryKey: ["billing", "sale", "lookups", "address-types"]
  });
  const countriesQuery = useQuery({
    queryFn: () => listSaleLocations("countries"),
    queryKey: ["billing", "sale", "lookups", "countries"]
  });
  const statesQuery = useQuery({
    queryFn: () => listSaleLocations("states"),
    queryKey: ["billing", "sale", "lookups", "states"]
  });
  const districtsQuery = useQuery({
    queryFn: () => listSaleLocations("districts"),
    queryKey: ["billing", "sale", "lookups", "districts"]
  });
  const citiesQuery = useQuery({
    queryFn: () => listSaleLocations("cities"),
    queryKey: ["billing", "sale", "lookups", "cities"]
  });
  const pincodesQuery = useQuery({
    queryFn: () => listSaleLocations("pincodes"),
    queryKey: ["billing", "sale", "lookups", "pincodes"]
  });

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  useEffect(() => {
    const india = (countriesQuery.data ?? []).find(
      (record) => record.name.toLowerCase() === "india" || record.code.toUpperCase() === "IN"
    );
    if (!india || form.countryId) return;
    setForm((current) => ({ ...current, countryId: String(india.id), countryName: india.name }));
  }, [countriesQuery.data, form.countryId]);

  useEffect(() => {
    if (form.addressTypeId) return;
    const addressType = (addressTypesQuery.data ?? []).find(
      (record) => record.name?.trim().toLowerCase() === form.addressTypeName.trim().toLowerCase()
    );
    if (!addressType) return;
    setForm((current) => ({ ...current, addressTypeId: String(addressType.id) }));
  }, [addressTypesQuery.data, form.addressTypeId, form.addressTypeName]);

  const locations = useMemo(
    () => ({
      cities: citiesQuery.data ?? [],
      countries: countriesQuery.data ?? [],
      districts: districtsQuery.data ?? [],
      pincodes: pincodesQuery.data ?? [],
      states: statesQuery.data ?? []
    }),
    [
      citiesQuery.data,
      countriesQuery.data,
      districtsQuery.data,
      pincodesQuery.data,
      statesQuery.data
    ]
  );

  async function createLocation(kind: SaleLocationKind, name: string) {
    const dependency =
      kind === "states"
        ? form.countryId
        : kind === "districts"
          ? form.stateId
          : kind === "cities"
            ? form.districtId
            : form.cityId;
    if (!dependency) return undefined;
    const created = await createSaleLocation(kind, saleAddressLocationPayload(kind, name, form));
    await {
      cities: citiesQuery,
      districts: districtsQuery,
      pincodes: pincodesQuery,
      states: statesQuery
    }[kind].refetch();
    toast.success(`${kind === "pincodes" ? "Pincode" : kind.slice(0, -1)} saved`, {
      description: name
    });
    return saleLocationOption(created);
  }

  const tabs: WorkspaceAnimatedTab[] = [
    {
      content: (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <Label>Address type</Label>
            <WorkspaceLookup
              createLabel="Save address type"
              createMode="inline"
              emptyLabel="No address types found. Type a value to create it."
              loading={addressTypesQuery.isLoading}
              options={(addressTypesQuery.data ?? [])
                .filter((record) => record.isActive !== false)
                .map(saleLookupOption)}
              placeholder="Search address type"
              value={form.addressTypeId || form.addressTypeName}
              onCreate={async (name) => {
                const created = await createSaleAddressType(name);
                await addressTypesQuery.refetch();
                toast.success("Address type saved", { description: name });
                return saleLookupOption(created);
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
          <AddressEditorField
            label="Address line 1"
            value={form.addressLine1}
            onChange={(addressLine1) => setForm((current) => ({ ...current, addressLine1 }))}
          />
          <AddressEditorField
            label="Address line 2"
            value={form.addressLine2}
            onChange={(addressLine2) => setForm((current) => ({ ...current, addressLine2 }))}
          />
          <label className="grid gap-2">
            <Label>Country</Label>
            <WorkspaceLookup
              allowTextValue={false}
              emptyLabel="No countries found."
              loading={countriesQuery.isLoading}
              options={locations.countries.map(saleLocationOption)}
              placeholder="Search country"
              value={form.countryId || form.countryName}
              onValueChange={(value) => {
                const country = locations.countries.find((record) => String(record.id) === value);
                if (!country) return;
                setForm((current) => ({
                  ...current,
                  countryId: String(country.id),
                  countryName: country.name,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <AddressLocationLookup
              kind="states"
              label="State"
              loading={statesQuery.isLoading}
              options={locations.states.filter(
                (record) => !form.countryId || String(record.countryId) === form.countryId
              )}
              value={form.stateId || form.stateName}
              onCreate={createLocation}
              onPick={(record) =>
                setForm((current) => saleAddressLocationPatch("states", record, current))
              }
            />
            <AddressLocationLookup
              kind="districts"
              label="District"
              loading={districtsQuery.isLoading}
              options={locations.districts.filter(
                (record) => !form.stateId || String(record.stateId) === form.stateId
              )}
              value={form.districtId || form.districtName}
              onCreate={createLocation}
              onPick={(record) =>
                setForm((current) => saleAddressLocationPatch("districts", record, current))
              }
            />
            <AddressLocationLookup
              kind="cities"
              label="City"
              loading={citiesQuery.isLoading}
              options={locations.cities.filter(
                (record) => !form.districtId || String(record.districtId) === form.districtId
              )}
              value={form.cityId || form.cityName}
              onCreate={createLocation}
              onPick={(record) =>
                setForm((current) => saleAddressLocationPatch("cities", record, current))
              }
            />
            <AddressLocationLookup
              kind="pincodes"
              label="Pincode"
              loading={pincodesQuery.isLoading}
              options={locations.pincodes.filter(
                (record) => !form.cityId || String(record.cityId) === form.cityId
              )}
              value={form.pincodeId || form.pincodeName}
              onCreate={createLocation}
              onPick={(record) =>
                setForm((current) => saleAddressLocationPatch("pincodes", record, current))
              }
            />
          </div>
        </div>
      ),
      label: "Address",
      value: "address"
    }
  ];

  return (
    <form
      className="grid gap-0"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <WorkspaceAnimatedTabs
        contentClassName="h-[26rem] overflow-y-auto px-5 pb-5"
        listClassName="rounded-none border-x-0 border-t-0 px-5 shadow-none"
        tabs={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
      />
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          <Save className="size-4" />
          Save contact
        </Button>
      </DialogFooter>
    </form>
  );
}

function saleAddressDraftFromRecord(
  address: Record<string, unknown>,
  fallbackType: string
): SaleAddressDraft {
  return {
    addressTypeId: String(address.addressTypeId ?? ""),
    addressLine1: String(address.addressLine1 ?? ""),
    addressLine2: String(address.addressLine2 ?? ""),
    addressTypeName: String(address.addressTypeName ?? fallbackType),
    cityId: String(address.cityId ?? ""),
    cityName: String(address.cityName ?? ""),
    countryId: String(address.countryId ?? ""),
    countryName: String(address.countryName ?? "India"),
    districtId: String(address.districtId ?? ""),
    districtName: String(address.districtName ?? ""),
    pincodeId: String(address.pincodeId ?? ""),
    pincodeName: String(address.pincodeName ?? ""),
    stateId: String(address.stateId ?? ""),
    stateName: String(address.stateName ?? "")
  };
}

function saleLookupOption(record: SaleLookupRecord): SaleLookupOption {
  const label = record.name || record.code || record.id;
  return { label, record, value: String(record.id) };
}

function AddressEditorField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-11 rounded-md"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AddressLocationLookup({
  kind,
  label,
  loading,
  onCreate,
  onPick,
  options,
  value
}: {
  kind: SaleLocationKind;
  label: string;
  loading: boolean;
  onCreate: (kind: SaleLocationKind, name: string) => Promise<SaleLookupOption | undefined>;
  onPick: (record: SaleLocationRecord) => void;
  options: SaleLocationRecord[];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <WorkspaceLookup
        allowTextValue={false}
        createLabel={`Create ${label.toLowerCase()}`}
        createMode="inline"
        emptyLabel={`No ${label.toLowerCase()} found. Type a value to create it.`}
        loading={loading}
        options={options.filter((record) => record.status !== "inactive").map(saleLocationOption)}
        placeholder={`Search ${label.toLowerCase()}`}
        value={value}
        onCreate={(name) => onCreate(kind, name)}
        onValueChange={(selected, option) => {
          const record =
            ((option as SaleLookupOption | undefined)?.record as SaleLocationRecord | undefined) ??
            options.find((item) => String(item.id) === selected);
          if (record) onPick(record);
        }}
      />
    </label>
  );
}

function saleLocationOption(record: SaleLocationRecord): SaleLookupOption {
  const label = record.name || record.pincode || record.code;
  return {
    label,
    record,
    value: String(record.id)
  };
}

function saleAddressLocationPayload(kind: SaleLocationKind, name: string, form: SaleAddressDraft) {
  const trimmedName = name.trim();
  const payload: Record<string, unknown> = {
    code: saleAddressLocationCode(trimmedName),
    countryId: numericAddressId(form.countryId),
    countryName: form.countryName || "India",
    name: trimmedName,
    sortOrder: 1000,
    status: "active"
  };
  if (kind !== "states") {
    payload.stateId = numericAddressId(form.stateId);
    payload.stateName = form.stateName || null;
  }
  if (kind === "cities" || kind === "pincodes") {
    payload.districtId = numericAddressId(form.districtId);
    payload.districtName = form.districtName || null;
  }
  if (kind === "pincodes") {
    payload.area = trimmedName;
    payload.cityId = numericAddressId(form.cityId);
    payload.cityName = form.cityName || null;
    payload.pincode = trimmedName;
  }
  return payload;
}

function numericAddressId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function saleAddressLocationPatch(
  kind: SaleLocationKind,
  record: SaleLocationRecord,
  form: SaleAddressDraft
): SaleAddressDraft {
  const label = record.pincode || record.name;
  const next = { ...form };
  if (kind === "states") {
    next.stateId = record.id;
    next.stateName = record.name;
    next.districtId = "";
    next.districtName = "";
    next.cityId = "";
    next.cityName = "";
    next.pincodeId = "";
    next.pincodeName = "";
  } else if (kind === "districts") {
    next.districtId = record.id;
    next.districtName = record.name;
    next.cityId = "";
    next.cityName = "";
    next.pincodeId = "";
    next.pincodeName = "";
  } else if (kind === "cities") {
    next.cityId = record.id;
    next.cityName = record.name;
    next.pincodeId = "";
    next.pincodeName = "";
  } else {
    next.pincodeId = record.id;
    next.pincodeName = label;
    next.cityId = record.cityId || next.cityId;
    next.cityName = record.cityName || next.cityName;
    next.districtId = record.districtId || next.districtId;
    next.districtName = record.districtName || next.districtName;
    next.stateId = record.stateId || next.stateId;
    next.stateName = record.stateName || next.stateName;
    next.countryId = record.countryId || next.countryId;
    next.countryName = record.countryName || next.countryName || "India";
  }
  return next;
}

function saleAddressLocationCode(value: string) {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "LOCATION"
  );
}
