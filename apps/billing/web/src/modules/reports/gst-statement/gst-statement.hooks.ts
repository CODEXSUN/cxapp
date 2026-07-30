import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../../shared/api/tenant-context";
import { getGstStatement } from "./gst-statement.services";
import type { GstStatementFilters } from "./gst-statement.types";

export function useGstStatement(filters: GstStatementFilters) {
  const companyId = getCompanyId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: () => getGstStatement(filters),
    queryKey: ["billing", "reports", "gst-statement", companyId, filters],
    placeholderData: (previous) => previous
  });
}
