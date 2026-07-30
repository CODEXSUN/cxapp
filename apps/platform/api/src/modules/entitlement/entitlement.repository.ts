import { createHash, randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type {
  Entitlement,
  EntitlementSavePayload,
  PlanAccess,
  TenantAccessSummary
} from "./entitlement.types.js";

export class EntitlementRepository {
  async list() {
    const rows = await getPlatformDatabase()
      .selectFrom("entitlements")
      .innerJoin("platform_apps", "platform_apps.id", "entitlements.app_id")
      .leftJoin("tenants", "tenants.id", "entitlements.tenant_id")
      .leftJoin("plans", "plans.id", "entitlements.plan_id")
      .select([
        "entitlements.id",
        "entitlements.uuid",
        "entitlements.scope",
        "entitlements.tenant_id",
        "entitlements.plan_id",
        "entitlements.app_id",
        "entitlements.module_key",
        "entitlements.starts_on",
        "entitlements.ends_on",
        "entitlements.source",
        "entitlements.status",
        "platform_apps.label as app_label",
        "tenants.tenant_name",
        "plans.name as plan_name"
      ])
      .orderBy("platform_apps.label")
      .orderBy("entitlements.scope")
      .execute();

    return rows.map((row): Entitlement => ({
      appId: Number(row.app_id),
      appLabel: row.app_label,
      endsOn: row.ends_on,
      id: Number(row.id),
      moduleKey: row.module_key,
      planId: row.plan_id === null ? null : Number(row.plan_id),
      planName: row.plan_name,
      scope: row.scope,
      source: row.source,
      startsOn: row.starts_on,
      status: row.status,
      tenantId: row.tenant_id === null ? null : Number(row.tenant_id),
      tenantName: row.tenant_name,
      uuid: row.uuid
    }));
  }

  async create(input: EntitlementSavePayload) {
    const result = await getPlatformDatabase()
      .insertInto("entitlements")
      .values({ ...toRow(input), uuid: randomBytes(4).toString("hex") })
      .executeTakeFirst();
    return this.find(Number(result.insertId));
  }

  async update(id: number, input: EntitlementSavePayload) {
    await getPlatformDatabase()
      .updateTable("entitlements")
      .set(toRow(input))
      .where("id", "=", id)
      .execute();
    return this.find(id);
  }

  private async find(id: number) {
    return (await this.list()).find((item) => item.id === id) ?? null;
  }

  async tenantIdsForPlan(planId: number) {
    const rows = await getPlatformDatabase()
      .selectFrom("subscriptions")
      .select("tenant_id")
      .where("plan_id", "=", planId)
      .where("status", "in", ["active", "trial"])
      .execute();
    return Array.from(new Set(rows.map((row) => Number(row.tenant_id))));
  }

  async resolveTenantModuleKeys(tenantId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const database = getPlatformDatabase();
    const keys = new Set<string>();

    const alwaysEnabledApps = await database
      .selectFrom("platform_apps")
      .select("module_key")
      .where("always_enabled", "=", true)
      .execute();
    for (const app of alwaysEnabledApps) keys.add(app.module_key);

    const tenantGrants = await database
      .selectFrom("entitlements")
      .select("module_key")
      .where("scope", "=", "tenant")
      .where("tenant_id", "=", tenantId)
      .where("status", "=", "active")
      .where("starts_on", "<=", today)
      .where((eb) => eb.or([eb("ends_on", "is", null), eb("ends_on", ">=", today)]))
      .execute();
    for (const grant of tenantGrants) keys.add(grant.module_key);

    const planGrants = await database
      .selectFrom("subscriptions")
      .innerJoin("entitlements", "entitlements.plan_id", "subscriptions.plan_id")
      .select("entitlements.module_key")
      .where("subscriptions.tenant_id", "=", tenantId)
      .where("subscriptions.status", "in", ["active", "trial"])
      .where("subscriptions.starts_on", "<=", today)
      .where((eb) =>
        eb.or([eb("subscriptions.ends_on", "is", null), eb("subscriptions.ends_on", ">=", today)])
      )
      .where("entitlements.scope", "=", "plan")
      .where("entitlements.status", "=", "active")
      .where("entitlements.starts_on", "<=", today)
      .where((eb) =>
        eb.or([eb("entitlements.ends_on", "is", null), eb("entitlements.ends_on", ">=", today)])
      )
      .execute();
    for (const grant of planGrants) keys.add(grant.module_key);

    return Array.from(keys)
      .map((key) => (key === "platform.tenant" ? "platform.application" : key))
      .sort();
  }

  async getPlanAccess(planId: number): Promise<PlanAccess | null> {
    const database = getPlatformDatabase();
    const plan = await database
      .selectFrom("plans")
      .select(["id", "name"])
      .where("id", "=", planId)
      .executeTakeFirst();
    if (!plan) return null;
    const apps = await database
      .selectFrom("platform_apps")
      .select(["id", "label", "module_key"])
      .orderBy("label")
      .execute();
    const grants = await database
      .selectFrom("entitlements")
      .select(["module_key", "status"])
      .where("scope", "=", "plan")
      .where("plan_id", "=", planId)
      .execute();
    const active = new Set(
      grants.filter((grant) => grant.status === "active").map((grant) => grant.module_key)
    );
    return {
      apps: apps.map((app) => ({
        appId: Number(app.id),
        appLabel: app.label,
        enabled: active.has(app.module_key),
        moduleKey: app.module_key
      })),
      planId: Number(plan.id),
      planName: plan.name
    };
  }

  async setPlanAccess(planId: number, moduleKeys: string[]) {
    const database = getPlatformDatabase();
    const access = await this.getPlanAccess(planId);
    if (!access) return null;
    const enabledKeys = new Set(["platform.application", ...moduleKeys]);
    const apps = await database.selectFrom("platform_apps").select(["id", "module_key"]).execute();
    for (const app of apps) {
      const status = enabledKeys.has(app.module_key) ? "active" : "inactive";
      const existing = await database
        .selectFrom("entitlements")
        .select("id")
        .where("scope", "=", "plan")
        .where("plan_id", "=", planId)
        .where("module_key", "=", app.module_key)
        .executeTakeFirst();
      if (existing) {
        await database
          .updateTable("entitlements")
          .set({
            app_id: Number(app.id),
            ends_on: null,
            source: "manual",
            status,
            tenant_id: null
          })
          .where("id", "=", Number(existing.id))
          .execute();
        continue;
      }
      await database
        .insertInto("entitlements")
        .values({
          app_id: Number(app.id),
          ends_on: null,
          module_key: app.module_key,
          plan_id: planId,
          scope: "plan",
          source: "manual",
          starts_on: new Date().toISOString().slice(0, 10),
          status,
          tenant_id: null,
          uuid: stableUuid(`entitlement:plan:${planId}:${app.module_key}`)
        })
        .execute();
    }
    return this.getPlanAccess(planId);
  }

  async listTenantAccessSummaries(): Promise<TenantAccessSummary[]> {
    const tenants = await getPlatformDatabase()
      .selectFrom("tenants")
      .select(["id", "uuid", "tenant_code", "tenant_name"])
      .orderBy("tenant_name")
      .execute();
    return Promise.all(
      tenants.map((tenant) =>
        this.tenantAccessSummary(
          Number(tenant.id),
          tenant.uuid,
          tenant.tenant_code,
          tenant.tenant_name
        )
      )
    );
  }

  private async tenantAccessSummary(
    tenantId: number,
    uuid: string,
    tenantCode: string,
    tenantName: string
  ): Promise<TenantAccessSummary> {
    const today = new Date().toISOString().slice(0, 10);
    const database = getPlatformDatabase();
    const subscription = await database
      .selectFrom("subscriptions")
      .innerJoin("plans", "plans.id", "subscriptions.plan_id")
      .select([
        "subscriptions.plan_id",
        "subscriptions.billing_cycle",
        "subscriptions.status",
        "plans.name as plan_name"
      ])
      .where("subscriptions.tenant_id", "=", tenantId)
      .where("subscriptions.status", "in", ["active", "trial"])
      .where("subscriptions.starts_on", "<=", today)
      .where((eb) =>
        eb.or([eb("subscriptions.ends_on", "is", null), eb("subscriptions.ends_on", ">=", today)])
      )
      .orderBy("subscriptions.id", "desc")
      .executeTakeFirst();
    const manual = await database
      .selectFrom("entitlements")
      .select("module_key")
      .where("tenant_id", "=", tenantId)
      .where("scope", "=", "tenant")
      .where("status", "=", "active")
      .execute();
    const plan = subscription
      ? await database
          .selectFrom("entitlements")
          .select("module_key")
          .where("plan_id", "=", Number(subscription.plan_id))
          .where("scope", "=", "plan")
          .where("status", "=", "active")
          .execute()
      : [];
    return {
      activeSubscription: subscription
        ? {
            billingCycle: subscription.billing_cycle,
            planId: Number(subscription.plan_id),
            planName: subscription.plan_name,
            status: subscription.status
          }
        : null,
      enabledModuleKeys: await this.resolveTenantModuleKeys(tenantId),
      manualModuleKeys: manual.map((item) => item.module_key).sort(),
      planModuleKeys: plan.map((item) => item.module_key).sort(),
      tenantCode,
      tenantId,
      tenantName,
      uuid
    };
  }
}

function toRow(input: EntitlementSavePayload) {
  return {
    app_id: input.appId,
    ends_on: input.endsOn,
    module_key: input.moduleKey.trim(),
    plan_id: input.scope === "plan" ? input.planId : null,
    scope: input.scope,
    source: input.source,
    starts_on: input.startsOn,
    status: input.status,
    tenant_id: input.scope === "tenant" ? input.tenantId : null
  };
}

function stableUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
