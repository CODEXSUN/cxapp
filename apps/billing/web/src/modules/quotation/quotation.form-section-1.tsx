import { Button } from "@codexsun/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Label } from "@codexsun/ui/components/label";
import { cn } from "@codexsun/ui/lib/utils";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { useQuery } from "@tanstack/react-query";
import { Save, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  locationPatch,
  locationPayload,
  quotationLocationOption,
  quotationPersistedOption
} from "./quotation.form-section-2";
import {
  createQuotationAddressType,
  createQuotationLocation,
  listQuotationAddressTypes,
  listQuotationContactTypes,
  listQuotationLocations,
  type QuotationContactSavePayload,
  type QuotationLocationKind,
  type QuotationLocationRecord,
  type QuotationLookupOption
} from "./quotation.services";

export function QuotationContactQuickForm({
  initialValue,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: QuotationContactSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: QuotationContactSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const [activeTab, setActiveTab] = useState("details");
  const [legalNameManual, setLegalNameManual] = useState(
    Boolean(initialValue.legalName && initialValue.legalName !== initialValue.name.toUpperCase())
  );
  const addressTypesQuery = useQuery({
    queryFn: listQuotationAddressTypes,
    queryKey: ["billing", "quotation", "lookups", "address-types"]
  });
  const countriesQuery = useQuery({
    queryFn: () => listQuotationLocations("countries"),
    queryKey: ["billing", "quotation", "lookups", "countries"]
  });
  const contactTypesQuery = useQuery({
    queryFn: listQuotationContactTypes,
    queryKey: ["billing", "quotation", "lookups", "contact-types"]
  });
  const statesQuery = useQuery({
    queryFn: () => listQuotationLocations("states"),
    queryKey: ["billing", "quotation", "lookups", "states"]
  });
  const districtsQuery = useQuery({
    queryFn: () => listQuotationLocations("districts"),
    queryKey: ["billing", "quotation", "lookups", "districts"]
  });
  const citiesQuery = useQuery({
    queryFn: () => listQuotationLocations("cities"),
    queryKey: ["billing", "quotation", "lookups", "cities"]
  });
  const pincodesQuery = useQuery({
    queryFn: () => listQuotationLocations("pincodes"),
    queryKey: ["billing", "quotation", "lookups", "pincodes"]
  });

  useEffect(() => {
    const india = (countriesQuery.data ?? []).find(
      (record) => record.name.toLowerCase() === "india" || record.code.toUpperCase() === "IN"
    );
    if (!india || form.countryId) return;
    setForm((current) => ({ ...current, countryId: String(india.id), countryName: india.name }));
  }, [countriesQuery.data, form.countryId]);

  useEffect(() => {
    const customer = (contactTypesQuery.data ?? []).find(
      (record) => record.name?.trim().toLowerCase() === "customer"
    );
    if (!customer || form.typeId) return;
    setForm((current) => ({
      ...current,
      typeId: String(customer.id),
      typeName: customer.name ?? "Customer"
    }));
  }, [contactTypesQuery.data, form.typeId]);

  useEffect(() => {
    if (form.addressTypeId) return;
    const addressType = (addressTypesQuery.data ?? []).find(
      (record) => record.name?.trim().toLowerCase() === form.addressTypeName.trim().toLowerCase()
    );
    if (!addressType) return;
    setForm((current) => ({ ...current, addressTypeId: String(addressType.id) }));
  }, [addressTypesQuery.data, form.addressTypeId, form.addressTypeName]);

  const locations = {
    cities: citiesQuery.data ?? [],
    districts: districtsQuery.data ?? [],
    pincodes: pincodesQuery.data ?? [],
    states: statesQuery.data ?? []
  };

  async function createLocation(kind: QuotationLocationKind, name: string) {
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
    const created = await createQuotationLocation(kind, locationPayload(kind, name, form));
    await {
      cities: citiesQuery,
      districts: districtsQuery,
      pincodes: pincodesQuery,
      states: statesQuery
    }[kind].refetch();
    toast.success(`${kind === "pincodes" ? "Pincode" : kind.slice(0, -1)} saved`, {
      description: name
    });
    return quotationLocationOption(created);
  }

  const tabs: WorkspaceAnimatedTab[] = [
    {
      content: (
        <div className="grid gap-4">
          <ContactQuickField
            label="Contact name"
            required
            value={form.name}
            onChange={(name) =>
              setForm((current) => ({
                ...current,
                name,
                ...(!legalNameManual ? { legalName: name.toUpperCase() } : {})
              }))
            }
          />
          <ContactQuickField
            forceUppercase
            label="Legal name"
            value={form.legalName}
            onChange={(legalName) => {
              setLegalNameManual(true);
              setForm((current) => ({ ...current, legalName }));
            }}
            onMagic={() => {
              setLegalNameManual(false);
              setForm((current) => ({ ...current, legalName: current.name.trim().toUpperCase() }));
            }}
          />
          <ContactQuickField
            forceUppercase
            label="GSTIN"
            value={form.gstin}
            onChange={(gstin) => setForm((current) => ({ ...current, gstin }))}
          />
          <ContactQuickField
            label="Phone"
            value={form.primaryPhone}
            onChange={(primaryPhone) => setForm((current) => ({ ...current, primaryPhone }))}
          />
        </div>
      ),
      label: "Details",
      value: "details"
    },
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
                .map(quotationPersistedOption)}
              placeholder="Search address type"
              value={form.addressTypeId || form.addressTypeName}
              onCreate={async (name) => {
                const created = await createQuotationAddressType(name);
                await addressTypesQuery.refetch();
                toast.success("Address type saved", { description: name });
                return quotationPersistedOption(created);
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
          <ContactQuickField
            label="Address line 1"
            value={form.addressLine1}
            onChange={(addressLine1) => setForm((current) => ({ ...current, addressLine1 }))}
          />
          <ContactQuickField
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
                loading={countriesQuery.isLoading}
                options={(countriesQuery.data ?? [])
                  .filter((record) => record.status !== "inactive")
                  .map(quotationLocationOption)}
                placeholder="Search country"
                value={
                  form.countryId ||
                  String(
                    (countriesQuery.data ?? []).find(
                      (record) => record.name.toLowerCase() === form.countryName.toLowerCase()
                    )?.id ?? ""
                  )
                }
                onValueChange={(selected, option) => {
                  const record =
                    ((option as QuotationLookupOption | undefined)?.record as
                      QuotationLocationRecord | undefined) ??
                    (countriesQuery.data ?? []).find((item) => String(item.id) === selected);
                  if (!record) return;
                  setForm((current) => ({
                    ...current,
                    countryId: String(record.id),
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
            <ContactLocationLookup
              label="State"
              kind="states"
              loading={statesQuery.isLoading}
              options={locations.states.filter(
                (record) => !form.countryId || String(record.countryId) === form.countryId
              )}
              value={form.stateId || form.stateName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("states", record, current))}
            />
            <ContactLocationLookup
              label="District"
              kind="districts"
              loading={districtsQuery.isLoading}
              options={locations.districts.filter(
                (record) => !form.stateId || String(record.stateId) === form.stateId
              )}
              value={form.districtId || form.districtName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("districts", record, current))}
            />
            <ContactLocationLookup
              label="City"
              kind="cities"
              loading={citiesQuery.isLoading}
              options={locations.cities.filter(
                (record) => !form.districtId || String(record.districtId) === form.districtId
              )}
              value={form.cityId || form.cityName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("cities", record, current))}
            />
            <ContactLocationLookup
              label="Pincode"
              kind="pincodes"
              loading={pincodesQuery.isLoading}
              options={locations.pincodes.filter(
                (record) => !form.cityId || String(record.cityId) === form.cityId
              )}
              value={form.pincodeId || form.pincodeName}
              onCreate={createLocation}
              onPick={(record) => setForm((current) => locationPatch("pincodes", record, current))}
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
        void onSave(form);
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
        <Button disabled={loading || !form.name.trim() || !form.typeId} type="submit">
          <Save className="size-4" />
          Save contact
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ContactQuickField({
  className,
  forceUppercase = false,
  label,
  onChange,
  onMagic,
  required,
  type = "text",
  value
}: {
  className?: string;
  forceUppercase?: boolean;
  label: string;
  onChange: (value: string) => void;
  onMagic?: () => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {onMagic ? (
          <Button
            aria-label="Refresh legal name from contact name"
            className="size-7 rounded-md p-0"
            onClick={(event) => {
              event.preventDefault();
              onMagic();
            }}
            title="Refresh legal name from contact name"
            type="button"
            variant="outline"
          >
            <Sparkles className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <Input
        autoCapitalize={forceUppercase ? "characters" : "none"}
        autoFocus={label === "Contact name"}
        className={cn("h-11 rounded-md", forceUppercase && "uppercase")}
        required={required}
        type={type}
        value={value}
        onChange={(event) =>
          onChange(forceUppercase ? event.target.value.toUpperCase() : event.target.value)
        }
      />
    </label>
  );
}

export function ContactLocationLookup({
  kind,
  label,
  loading,
  onCreate,
  onPick,
  options,
  value
}: {
  kind: QuotationLocationKind;
  label: string;
  loading: boolean;
  onCreate: (
    kind: QuotationLocationKind,
    name: string
  ) => Promise<QuotationLookupOption | undefined>;
  onPick: (record: QuotationLocationRecord) => void;
  options: QuotationLocationRecord[];
  value: string;
}) {
  const lookupOptions = options
    .filter((record) => record.status !== "inactive")
    .map(quotationLocationOption);
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <WorkspaceLookup
        allowTextValue={false}
        createLabel={`Create ${label.toLowerCase()}`}
        createMode="inline"
        emptyLabel={`No ${label.toLowerCase()} found. Type a value to create it.`}
        loading={loading}
        options={lookupOptions}
        placeholder={`Search ${label.toLowerCase()}`}
        value={value}
        onCreate={(name) => onCreate(kind, name)}
        onValueChange={(selected, option) => {
          const record =
            ((option as QuotationLookupOption | undefined)?.record as
              QuotationLocationRecord | undefined) ??
            options.find((item) => String(item.id) === selected);
          if (record) onPick(record);
        }}
      />
    </label>
  );
}
