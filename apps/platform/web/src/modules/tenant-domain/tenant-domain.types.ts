export type TenantDomain = {
  domain: string;
  id: number;
  isPrimary: boolean;
  tenantId: number;
  uuid: string;
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
