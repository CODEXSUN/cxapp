import { useEffect, useState } from "react";

type TenantSiteLogoProps = {
  brandName: string;
  className?: string;
  logoDarkUrl: string | null;
  logoUrl: string | null;
};

export function TenantSiteLogo({
  brandName,
  className,
  logoDarkUrl,
  logoUrl
}: TenantSiteLogoProps) {
  const [companyLogoFailed, setCompanyLogoFailed] = useState(false);
  useEffect(() => setCompanyLogoFailed(false), [logoDarkUrl, logoUrl]);
  const lightLogo = companyLogoFailed ? "/logo/logo.svg" : (logoUrl ?? "/logo/logo.svg");
  const darkLogo = companyLogoFailed
    ? "/logo/logo-dark.svg"
    : (logoDarkUrl ?? logoUrl ?? "/logo/logo-dark.svg");

  return (
    <picture className={className}>
      <source media="(prefers-color-scheme: dark)" srcSet={darkLogo} />
      <img src={lightLogo} alt={`${brandName} logo`} onError={() => setCompanyLogoFailed(true)} />
    </picture>
  );
}
