import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../../shared/api/tenant-context";
import { getSupplierStatement } from "./supplier-statement.services";
import type { SupplierStatementFilters } from "./supplier-statement.types";

export function useSupplierStatement(filters: SupplierStatementFilters) {
  const companyId = getCompanyId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: () => getSupplierStatement(filters),
    queryKey: ["billing", "reports", "supplier-statement", companyId, filters],
    placeholderData: (previous) => previous
  });
}
