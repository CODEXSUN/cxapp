export type TenantDomain = {
  domain: string;
  id: number;
  isPrimary: boolean;
  status: "active" | "disabled";
  tenantId: number;
  uuid: string;
  verificationStatus: "pending" | "verified";
  verificationToken?: string;
  verifiedAt: string | null;
};

export type TenantDomainRecord = TenantDomain & {
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
};

export type TenantPrimaryDomainPayload = {
  domain: string;
};

export type TenantDomainSavePayload = {
  domain: string;
  tenantId: number;
};
