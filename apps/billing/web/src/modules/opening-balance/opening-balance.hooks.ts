import { useQuery } from "@tanstack/react-query";
import { getCompanyId, getFinancialYearId } from "../../shared/api/tenant-context";
import { getOpeningBalances } from "./opening-balance.services";
export function useOpeningBalances() {
  return useQuery({
    queryKey: ["billing", "opening-balances", getCompanyId(), getFinancialYearId()],
    queryFn: getOpeningBalances
  });
}
