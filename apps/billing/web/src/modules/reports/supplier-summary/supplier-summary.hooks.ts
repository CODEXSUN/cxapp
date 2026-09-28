import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../../shared/api/tenant-context";
import { getSupplierSummary } from "./supplier-summary.services";

export function useSupplierSummary() {
  const companyId = getCompanyId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: getSupplierSummary,
    queryKey: ["billing", "reports", "supplier-summary", companyId]
  });
}
