import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../../shared/api/tenant-context";
import { getCustomerStatement } from "./customer-statement.services";
import type { CustomerStatementFilters } from "./customer-statement.types";

export function useCustomerStatement(filters: CustomerStatementFilters) {
  const companyId = getCompanyId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: () => getCustomerStatement(filters),
    queryKey: ["billing", "reports", "customer-statement", companyId, filters],
    placeholderData: (previous) => previous
  });
}
