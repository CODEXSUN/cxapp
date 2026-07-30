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

export type TenantDomainSavePayload = {
  domain: string;
  isPrimary?: boolean;
  status?: "active" | "disabled";
  tenantId: number;
};

export type TenantDomainRecord = TenantDomain & {
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
};
