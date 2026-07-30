export type TenantDomain = {
  domain: string;
  id: number;
  isPrimary: boolean;
  tenantId: number;
  uuid: string;
};

export type TenantDomainSavePayload = {
  domain: string;
  isPrimary?: boolean;
  tenantId: number;
};

export type TenantDomainRecord = TenantDomain & {
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
};
