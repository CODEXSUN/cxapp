import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompanyId } from "../../shared/api/tenant-context";
import { getBillingSettings } from "./settings.services";

export function billingSettingsQueryKey(companyId = getCompanyId()) {
  return ["billing", "settings", companyId] as const;
}

export function useCompanyContextId() {
  const [companyId, setCompanyId] = useState(getCompanyId);
  useEffect(() => {
    const update = () => setCompanyId(getCompanyId());
    window.addEventListener("codexsun:company-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("codexsun:company-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return companyId;
}

export function useBillingSettings() {
  const companyId = useCompanyContextId();
  return useQuery({
    enabled: Boolean(companyId),
    queryFn: getBillingSettings,
    queryKey: billingSettingsQueryKey(companyId)
  });
}

export const useSalesSettings = useBillingSettings;
