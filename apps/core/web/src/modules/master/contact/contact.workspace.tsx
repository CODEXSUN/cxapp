import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { ContactForm } from "./contact.form";
import {
  contactLookupsQueryKey,
  contactsQueryKey,
  useContactLookups,
  useContacts
} from "./contact.hooks";
import { ContactList } from "./contact.list";
import {
  createContact,
  createAddressTypeLookup,
  createBankNameLookup,
  createCityLookup,
  createContactGroupLookup,
  createContactTypeLookup,
  createCountryLookup,
  createDistrictLookup,
  createPincodeLookup,
  createStateLookup,
  forceDeleteContact,
  getNextContactCode,
  setContactActive,
  updateContact
} from "./contact.services";
import type {
  ContactLookupCreate,
  ContactLookups,
  ContactRecord,
  ContactSavePayload
} from "./contact.types";

const emptyLookups: ContactLookups = {
  contactTypes: [],
  contactGroups: [],
  addressTypes: [],
  bankNames: [],
  countries: [],
  states: [],
  districts: [],
  cities: [],
  pincodes: []
};
export function ContactWorkspace() {
  const client = useQueryClient(),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<ContactRecord | null | undefined>(undefined),
    [newCode, setNewCode] = useState(""),
    query = useContacts(search),
    lookupsQuery = useContactLookups(),
    records = query.data ?? [];
  const save = useMutation({
    mutationFn: (payload: ContactSavePayload) =>
      editing ? updateContact(editing.id, payload) : createContact(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactsQueryKey });
      toast.success("Contact saved");
      setNewCode("");
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save contact", { description: error.message })
  });
  const generateCode = useMutation({
    mutationFn: getNextContactCode,
    onSuccess: ({ code }) => {
      setNewCode(code);
      setEditing(null);
    },
    onError: (error) =>
      toast.error("Unable to generate contact code", { description: error.message })
  });
  const action = useMutation({
    mutationFn: ({ record, type }: { record: ContactRecord; type: "delete" | "toggle" }) =>
      type === "delete"
        ? forceDeleteContact(record.id)
        : setContactActive(record.id, !record.isActive),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactsQueryKey });
    },
    onError: (error) => toast.error("Unable to update contact", { description: error.message })
  });
  const refreshLookups = async <Record,>(work: () => Promise<Record>) => {
    const record = await work();
    await client.invalidateQueries({ queryKey: contactLookupsQueryKey });
    return record;
  };
  const createLookup: ContactLookupCreate = {
    contactType: (name) => refreshLookups(() => createContactTypeLookup(name)),
    contactGroup: (name) => refreshLookups(() => createContactGroupLookup(name)),
    addressType: (name) => refreshLookups(() => createAddressTypeLookup(name)),
    bankName: (name) => refreshLookups(() => createBankNameLookup(name)),
    country: (name) => refreshLookups(() => createCountryLookup(name)),
    state: (name, countryId) => refreshLookups(() => createStateLookup(name, countryId)),
    district: (name, stateId) => refreshLookups(() => createDistrictLookup(name, stateId)),
    city: (name, districtId) => refreshLookups(() => createCityLookup(name, districtId)),
    pincode: (postalCode, area, cityId) =>
      refreshLookups(() => createPincodeLookup(postalCode, area, cityId))
  };
  if (editing !== undefined)
    return (
      <ContactForm
        createLookup={createLookup}
        error={save.error?.message ?? ""}
        loading={save.isPending}
        lookups={lookupsQuery.data ?? emptyLookups}
        lookupsLoading={lookupsQuery.isLoading}
        nextCode={newCode}
        record={editing}
        onBack={() => {
          setNewCode("");
          setEditing(undefined);
        }}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  return (
    <WorkspacePage
      title="Contacts"
      description="Manage contact identity, tax, communication, address, finance, and lifecycle details."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button disabled={generateCode.isPending} onClick={() => generateCode.mutate()}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchPlaceholder="Search code, contact, phone, or email"
        searchValue={search}
        onSearchValueChange={setSearch}
      />
      <ContactList
        loading={query.isFetching && !query.data}
        records={records}
        onEdit={setEditing}
        onForceDelete={(record) => {
          if (confirm(`Force delete ${record.name}?`)) action.mutate({ record, type: "delete" });
        }}
        onToggle={(record) => action.mutate({ record, type: "toggle" })}
      />
    </WorkspacePage>
  );
}
