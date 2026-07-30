import type { CSSProperties, ReactNode } from "react";
import { useCompanyBranding } from "@codexsun/core-web/modules/organisation/company";
import { cn } from "@codexsun/ui/lib/utils";
import { useBillingSettings, useCompanyContextId } from "./settings.hooks";
import { defaultBillingSettings, type BillingSettings } from "./settings.types";

export function BillingDocumentHeader({
  className,
  documentMeta,
  documentTitle,
  settings: settingsOverride
}: {
  className?: string;
  documentMeta?: ReactNode;
  documentTitle?: ReactNode;
  settings?: BillingSettings;
}) {
  const companyId = useCompanyContextId();
  const settingsQuery = useBillingSettings();
  const branding = useCompanyBranding(companyId);
  const settings = settingsOverride ?? settingsQuery.data ?? defaultBillingSettings;
  const letterhead = settings.printing.letterhead;
  const company = branding.company;
  const address = company?.addresses.find((item) => item.isDefault) ?? company?.addresses[0];
  const addressLines = formatAddress(address);
  const contacts = [company?.primaryPhone, company?.primaryEmail].filter(Boolean).join(" · ");

  return (
    <header
      className={cn("relative overflow-hidden border-b bg-white text-black", className)}
      style={
        {
          borderColor: letterhead.borderColor,
          height: `${Math.max(20, letterhead.headerHeightMm)}mm`
        } as CSSProperties
      }
    >
      {settings.printing.printWithLogo && branding.lightLogoUrl ? (
        <img
          alt={`${company?.name ?? "Company"} logo`}
          className="absolute object-contain"
          src={branding.lightLogoUrl}
          style={{
            height: `${Math.max(1, letterhead.logoHeightMm)}mm`,
            left: `${Math.max(0, letterhead.logoLeftMm)}mm`,
            top: `${Math.max(0, letterhead.logoTopMm)}mm`,
            width: `${Math.max(1, letterhead.logoWidthMm)}mm`
          }}
        />
      ) : null}
      <div className="flex h-full flex-col items-center justify-center px-[34mm] py-2 text-center">
        <div
          className="font-bold leading-tight"
          style={{
            color: letterhead.companyColor,
            fontFamily: letterhead.companyFont,
            fontSize: `${Math.max(10, letterhead.companySize)}px`
          }}
        >
          {company?.name ?? "Company"}
        </div>
        {addressLines.map((line) => (
          <div
            key={line}
            className="mt-0.5 leading-tight"
            style={{
              color: letterhead.addressColor,
              fontFamily: letterhead.addressFont,
              fontSize: `${Math.max(7, letterhead.addressSize)}px`
            }}
          >
            {line}
          </div>
        ))}
        {contacts ? (
          <div
            className="mt-1 leading-tight"
            style={{
              color: letterhead.addressColor,
              fontFamily: letterhead.addressFont,
              fontSize: `${Math.max(7, letterhead.contactSize)}px`
            }}
          >
            {contacts}
          </div>
        ) : null}
        {company?.gstin ? (
          <div
            className="mt-1 font-semibold leading-tight"
            style={{
              color: letterhead.addressColor,
              fontFamily: letterhead.addressFont,
              fontSize: `${Math.max(7, letterhead.taxSize)}px`
            }}
          >
            GSTIN/UIN: {company.gstin}
          </div>
        ) : null}
        {documentTitle ? (
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest">
            {documentTitle}
          </div>
        ) : null}
        {documentMeta ? <div className="mt-0.5 text-[9px]">{documentMeta}</div> : null}
      </div>
    </header>
  );
}

export function BillingCompanyName({ fallback = "Company" }: { fallback?: string }) {
  const companyId = useCompanyContextId();
  return <>{useCompanyBranding(companyId).company?.name ?? fallback}</>;
}

function formatAddress(
  address:
    | {
        addressLine1: string;
        addressLine2: string | null;
        cityName: string | null;
        countryName: string | null;
        districtName: string | null;
        pincodeName: string | null;
        stateName: string | null;
      }
    | undefined
) {
  if (!address) return [];
  const first = [address.addressLine1, address.addressLine2].filter(Boolean).join(", ");
  const second = [
    address.cityName,
    address.districtName,
    address.stateName,
    address.countryName,
    address.pincodeName
  ]
    .filter(Boolean)
    .join(", ");
  return [first, second].filter(Boolean);
}
