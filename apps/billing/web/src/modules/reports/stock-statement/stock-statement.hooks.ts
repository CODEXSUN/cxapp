import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../../shared/api/tenant-context";
import { getStockStatement } from "./stock-statement.services";
import type { StockStatementFilters } from "./stock-statement.types";

export function useStockStatement(filters: StockStatementFilters) {
  const companyId = getCompanyId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: () => getStockStatement(filters),
    queryKey: ["billing", "reports", "stock-statement", companyId, filters],
    placeholderData: (previous) => previous
  });
}
