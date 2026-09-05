import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";

const permissions = [
  "accounts.accounting.view",
  "accounts.accounting.create",
  "accounts.accounting.update",
  "accounts.accounting.delete",
  "accounts.accounting.lifecycle",
  "accounts.accounting.post"
] as const;

export async function seedAccountingTenantPermissions(database: Kysely<unknown>) {
  const available = await sql<{ table_count: string | number }>`
    SELECT COUNT(*) AS table_count FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN ('app_permissions','app_roles','app_role_permissions')
  `.execute(database);
  if (Number(available.rows[0]?.table_count ?? 0) !== 3) return;
  for (const key of permissions) {
    const label = key.split(".").join(" · ");
    await sql`
      INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
      VALUES (${stable(key)}, ${key}, ${label}, ${`Allows ${label.toLowerCase()} in Accounts.`}, 'active', TRUE)
      ON DUPLICATE KEY UPDATE
        label=VALUES(label), description=VALUES(description), status='active', is_protected=TRUE
    `.execute(database);
    await sql`
      INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${stable(`role-permission:admin:${key}`)}, role.id, permission.id, 'active', TRUE
      FROM app_roles role
      INNER JOIN app_permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`='admin'
      ON DUPLICATE KEY UPDATE status='active', is_protected=TRUE
    `.execute(database);
  }
}

const defaultGroups = [
  { code: "1000", name: "Assets", normalBalance: "debit" },
  { code: "2000", name: "Liabilities", normalBalance: "credit" },
  { code: "3000", name: "Equity", normalBalance: "credit" },
  { code: "4000", name: "Income", normalBalance: "credit" },
  { code: "5000", name: "Expenses", normalBalance: "debit" }
] as const;

const defaultAccounts = [
  { code: "1001", name: "Cash in Hand", type: "asset", balance: "debit" },
  { code: "1002", name: "Bank Account", type: "asset", balance: "debit" },
  { code: "2001", name: "Accounts Payable", type: "liability", balance: "credit" },
  { code: "3001", name: "Capital Account", type: "equity", balance: "credit" },
  { code: "4001", name: "Sales", type: "income", balance: "credit" },
  { code: "5001", name: "Purchase", type: "expense", balance: "debit" },
  { code: "5002", name: "Salaries", type: "expense", balance: "debit" }
] as const;

const defaultRules = [
  {
    ruleType: "MANUAL_JOURNAL",
    name: "Manual journal entry",
    description: "Allows users to post balanced manual journal entries.",
    config: { requiresApproval: false }
  },
  {
    ruleType: "OPENING_BALANCE",
    name: "Opening balance entry",
    description: "Seeds opening balances for chart of accounts at financial-year start.",
    config: { restrictToGroups: ["asset", "liability", "equity"] }
  },
  {
    ruleType: "CASH_RECEIPT",
    name: "Cash receipt",
    description: "Books cash receipts against receivable or income accounts.",
    config: { cashAccountType: "asset" }
  }
] as const;

export async function seedAccountingModule<Database>(database: Kysely<Database>) {
  await seedAccountingTenantPermissions(database as unknown as Kysely<unknown>);
  await seedChartOfAccounts(database);
  await seedAccountingPeriods(database);
  await seedAccountingRules(database);
}

export async function seedChartOfAccounts<Database>(database: Kysely<Database>) {
  const scope = await defaultAccountingScope(database);
  if (!scope) return;

  const { companyId, financialYearId } = scope;
  const existing = await sql<{ count: string | number }>`
    SELECT COUNT(*) AS count FROM accounts_accounts
    WHERE company_id=${companyId} AND financial_year_id=${financialYearId}
  `.execute(database);
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  const groupIds = new Map<string, number>();
  for (const group of defaultGroups) {
    const inserted = await sql`
      INSERT INTO accounts_account_groups
        (uuid, company_id, financial_year_id, code, name, normal_balance, is_system, status, created_by)
      VALUES
        (${stable(`${companyId}:${financialYearId}:group:${group.code}`)}, ${companyId}, ${financialYearId},
         ${group.code}, ${group.name}, ${group.normalBalance}, TRUE, 'active', 'system:seed')
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `.execute(database);
    const id = Number(inserted.insertId);
    groupIds.set(group.code, id);
  }

  for (const account of defaultAccounts) {
    const isCash = account.code === "1001" ? 1 : 0;
    const isBank = account.code === "1002" ? 1 : 0;
    await sql`
      INSERT INTO accounts_accounts
        (uuid, company_id, financial_year_id, group_id, code, name, account_type, normal_balance,
         is_group, is_system, is_postable, opening_balance, currency_code, description, status, created_by,
         is_cash, is_bank)
      VALUES
        (${stable(`${companyId}:${financialYearId}:account:${account.code}`)}, ${companyId}, ${financialYearId},
         ${groupIds.get(`${account.code.slice(0, 1)}000`) ?? null}, ${account.code}, ${account.name},
         ${account.type}, ${account.balance}, FALSE, TRUE, TRUE, 0, 'INR', ${account.name}, 'active', 'system:seed',
         ${isCash}, ${isBank})
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)
    `.execute(database);
  }

  await sql`
    UPDATE accounts_accounts SET is_cash=1 WHERE code='1001' AND company_id=${companyId} AND financial_year_id=${financialYearId}
  `.execute(database);
  await sql`
    UPDATE accounts_accounts SET is_bank=1 WHERE code='1002' AND company_id=${companyId} AND financial_year_id=${financialYearId}
  `.execute(database);
}

export async function seedAccountingPeriods<Database>(database: Kysely<Database>) {
  const scope = await defaultAccountingScope(database);
  if (!scope) return;

  const { companyId, financialYearId } = scope;
  const periodResult = await sql<{ id: number; start_date: string; end_date: string }>`
    SELECT id, DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date
    FROM core_financial_years
    WHERE id=${financialYearId} AND status='active'
    LIMIT 1
  `.execute(database);
  const period = periodResult.rows[0];
  if (!period) return;

  const existing = await sql<{ count: string | number }>`
    SELECT COUNT(*) AS count FROM accounts_accounting_periods
    WHERE company_id=${companyId} AND financial_year_id=${financialYearId}
  `.execute(database);
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  await sql`
    INSERT INTO accounts_accounting_periods
      (uuid, company_id, financial_year_id, name, start_date, end_date, status, is_system, created_by)
    VALUES
      (${stable(`${companyId}:${financialYearId}:period:annual`)}, ${companyId}, ${financialYearId},
       'Annual', ${period.start_date}, ${period.end_date}, 'open', TRUE, 'system:seed')
    ON DUPLICATE KEY UPDATE start_date=VALUES(start_date), end_date=VALUES(end_date), status='open'
  `.execute(database);
}

export async function seedAccountingRules<Database>(database: Kysely<Database>) {
  const scope = await defaultAccountingScope(database);
  if (!scope) return;

  const { companyId } = scope;
  for (const rule of defaultRules) {
    await sql`
      INSERT INTO accounts_accounting_rules
        (uuid, company_id, rule_type, name, description, config_json, is_active, status, created_by)
      VALUES
        (${stable(`${companyId}:rule:${rule.ruleType}`)}, ${companyId}, ${rule.ruleType}, ${rule.name},
         ${rule.description}, ${JSON.stringify(rule.config)}, TRUE, 'active', 'system:seed')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description),
        config_json=VALUES(config_json), is_active=TRUE, status='active'
    `.execute(database);
  }
}

async function defaultAccountingScope<Database>(database: Kysely<Database>) {
  const result = await sql<{ company_id: number; financial_year_id: number }>`
    SELECT dc.company_id AS company_id, dc.financial_year_id AS financial_year_id
    FROM core_default_company_settings dc
    WHERE dc.singleton_key = 1 AND dc.status = 'active'
    LIMIT 1
  `.execute(database);
  const row = result.rows[0];
  if (row && row.company_id && row.financial_year_id) {
    return { companyId: Number(row.company_id), financialYearId: Number(row.financial_year_id) };
  }
  return null;
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
