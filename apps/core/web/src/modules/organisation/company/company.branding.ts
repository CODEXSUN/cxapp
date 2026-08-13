import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompany, readCompanyLogo } from "./company.services";

export function useCompanyBranding(companyId: number | null) {
  const companyQuery = useQuery({
    enabled: Boolean(companyId),
    queryFn: () => getCompany(companyId!),
    queryKey: ["core", "organisation", "companies", companyId]
  });
  const company = companyQuery.data;
  const lightLogoQuery = useQuery({
    enabled: Boolean(company?.logoPath),
    queryFn: () => readCompanyLogo(companyId!, "logo"),
    queryKey: ["core", "organisation", "companies", companyId, "logo", company?.updatedAt]
  });
  const darkLogoQuery = useQuery({
    enabled: Boolean(company?.logoDarkPath),
    queryFn: () => readCompanyLogo(companyId!, "logo-dark"),
    queryKey: ["core", "organisation", "companies", companyId, "logo-dark", company?.updatedAt]
  });
  const lightLogoUrl = useBlobUrl(lightLogoQuery.data);
  const darkLogoUrl = useBlobUrl(darkLogoQuery.data) ?? lightLogoUrl;

  return {
    brandName: company ? companyBrandName(company) : null,
    company,
    darkLogoUrl,
    isLoading: companyQuery.isLoading || lightLogoQuery.isLoading || darkLogoQuery.isLoading,
    lightLogoUrl
  };
}

export function companyBrandName(company: { legalName: string | null; name: string }) {
  return company.legalName?.trim() || company.name.trim();
}

function useBlobUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
