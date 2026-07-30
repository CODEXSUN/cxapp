import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCompanies, listCompanyLookups } from "./company.services";

export const companiesQueryKey = ["core", "organisation", "companies"] as const;
export const companyLookupsQueryKey = ["core", "organisation", "companies", "lookups"] as const;

export function useCompanies(search = "") {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listCompanies(search),
    queryKey: [...companiesQueryKey, search]
  });
}
export function useCompanyLookups() {
  return useQuery({ queryFn: listCompanyLookups, queryKey: companyLookupsQueryKey });
}
