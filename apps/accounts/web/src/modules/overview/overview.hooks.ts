import { useQuery } from "@tanstack/react-query";
import { getCompanyId, getFinancialYearId } from "../../shared/api/tenant-context";
import { getAccountsOverview } from "./overview.api";

export function useAccountsOverview() {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(companyId && financialYearId),
    queryFn: getAccountsOverview,
    queryKey: ["accounts", "overview", companyId, financialYearId]
  });
}