import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { CompanyForm } from "./company.form";
import {
  companiesQueryKey,
  companyLookupsQueryKey,
  useCompanies,
  useCompanyLookups
} from "./company.hooks";
import { CompanyList } from "./company.list";
import {
  activateCompany,
  createAddressTypeLookup,
  createBankNameLookup,
  createCityLookup,
  createCompany,
  createCountryLookup,
  createDistrictLookup,
  createPincodeLookup,
  createStateLookup,
  deactivateCompany,
  forceDeleteCompany,
  updateCompany
} from "./company.services";
import type {
  CompanyLookupCreate,
  CompanyLookups,
  CompanyRecord,
  CompanySavePayload
} from "./company.types";

const emptyLookups: CompanyLookups = {
  industries: [],
  addressTypes: [],
  bankNames: [],
  countries: [],
  states: [],
  districts: [],
  cities: [],
  pincodes: []
};
export function CompanyWorkspace() {
  const client = useQueryClient(),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<CompanyRecord | null | undefined>(undefined),
    query = useCompanies(search),
    lookupsQuery = useCompanyLookups(),
    records = query.data ?? [];
  const save = useMutation({
    mutationFn: (payload: CompanySavePayload) =>
      editing ? updateCompany(editing.id, payload) : createCompany(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: companiesQueryKey });
      toast.success("Company saved");
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save company", { description: error.message })
  });
  const lifecycle = useMutation({
    mutationFn: ({
      record,
      type
    }: {
      record: CompanyRecord;
      type: "force-delete" | "restore" | "suspend";
    }) =>
      type === "force-delete"
        ? forceDeleteCompany(record.id)
        : type === "restore"
          ? activateCompany(record.id)
          : deactivateCompany(record.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: companiesQueryKey });
      toast.success("Company status updated");
    },
    onError: (error) => toast.error("Unable to update company", { description: error.message })
  });
  const refreshLookups = async <Record,>(work: () => Promise<Record>) => {
    const result = await work();
    await client.invalidateQueries({ queryKey: companyLookupsQueryKey });
    return result;
  };
  const createLookup: CompanyLookupCreate = {
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
      <CompanyForm
        createLookup={createLookup}
        error={save.error?.message ?? ""}
        loading={save.isPending}
        lookups={lookupsQuery.data ?? emptyLookups}
        lookupsLoading={lookupsQuery.isLoading}
        record={editing}
        records={records}
        onBack={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  return (
    <WorkspacePage
      title="Companies"
      description="Manage organisation companies, tax identity, communication, and industry details."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchPlaceholder="Search code, company, phone, or email"
        searchValue={search}
        onSearchValueChange={setSearch}
      />
      <CompanyList
        loading={query.isFetching && !query.data}
        records={records}
        onEdit={setEditing}
        onForceDelete={(record) => {
          if (window.confirm(`Force delete ${record.name}?`))
            lifecycle.mutate({ record, type: "force-delete" });
        }}
        onRestore={(record) => lifecycle.mutate({ record, type: "restore" })}
        onSuspend={(record) => lifecycle.mutate({ record, type: "suspend" })}
      />
    </WorkspacePage>
  );
}
