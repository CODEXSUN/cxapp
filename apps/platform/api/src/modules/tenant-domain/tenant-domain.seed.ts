export const tenantDomainSeed = {
  key: "platform.tenant-domain.seed",
  description: "Tenant domains are seeded with their owning tenant."
} as const;

export async function seedTenantDomain(
  input: { domain: string; tenantId: number },
  save: (input: { domain: string; tenantId: number }) => Promise<string>
) {
  return save(input);
}
