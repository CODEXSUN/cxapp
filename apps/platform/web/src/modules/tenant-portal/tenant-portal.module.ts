export const tenantPortalModule = {
  capability: "public-read-projection",
  exemptions: ["crud-form", "crud-list", "crud-hooks", "crud-schema", "crud-workspace"],
  owner: "platform.tenant"
} as const;
