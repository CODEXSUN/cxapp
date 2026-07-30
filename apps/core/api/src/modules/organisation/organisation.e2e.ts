import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import {
  bootstrapCoreDatabase,
  closeCoreDatabase,
  runWithCoreDatabase
} from "../../database/core-database.js";
import { env } from "../../env.js";
import { CompanyRepository } from "./company/company.repository.js";

export async function runOrganisationE2e() {
  const databaseName = `codexsun_organisation_e2e_${Date.now()}`;
  const admin = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  });

  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrapCoreDatabase(databaseName);
    await admin.changeUser({ database: databaseName });

    const initial = await loadSeedState(admin);
    assert.equal(initial.companies.length, 1);
    assert.equal(initial.companies[0]?.code, "CODEXSUN");
    assert.equal(initial.companies[0]?.name, "codexsun");
    assert.equal(initial.companies[0]?.status, "active");
    assert.equal(initial.companies[0]?.legal_name, null);
    assert.equal(Number(initial.companies[0]?.tds_available), 0);
    assert.equal(Number(initial.companies[0]?.tcs_available), 0);
    assert.deepEqual(JSON.parse(String(initial.companies[0]?.emails_json)), []);
    assert.equal(initial.financialYears.length, 1);
    assert.equal(Number(initial.financialYears[0]?.is_current), 1);
    assert.equal(initial.financialYears[0]?.status, "active");
    assert.equal(initial.defaults.length, 1);
    assert.equal(initial.defaults[0]?.company_id, initial.companies[0]?.id);
    assert.equal(initial.defaults[0]?.financial_year_id, initial.financialYears[0]?.id);
    assert.equal(initial.defaults[0]?.landing_app, "application");

    await runWithCoreDatabase(databaseName, () =>
      new CompanyRepository().create({ name: "Dummy E2E Company" })
    );
    await closeCoreDatabase();
    await bootstrapCoreDatabase(databaseName);

    const restarted = await loadSeedState(admin);
    assert.equal(restarted.companies.length, 2);
    assert.equal(restarted.companies.filter((company) => company.code === "CODEXSUN").length, 1);
    assert.equal(restarted.financialYears.length, 1);
    assert.equal(restarted.defaults.length, 1);
    assert.equal(restarted.defaults[0]?.company_id, initial.companies[0]?.id);
    assert.equal(restarted.defaults[0]?.financial_year_id, initial.financialYears[0]?.id);

    return {
      companyId: initial.companies[0]?.id,
      databaseName,
      financialYearId: initial.financialYears[0]?.id
    };
  } finally {
    await closeCoreDatabase();
    await admin.changeUser({ database: env.DB_MASTER_NAME });
    await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await admin.end();
  }
}

async function loadSeedState(admin: Awaited<ReturnType<typeof createConnection>>) {
  const [companies] = await admin.query<Array<RowDataPacket & CompanyRow>>(
    "SELECT id,code,name,legal_name,tds_available,tcs_available,status,emails_json FROM companies ORDER BY id"
  );
  const [financialYears] = await admin.query<Array<RowDataPacket & FinancialYearRow>>(
    "SELECT id,is_current,status FROM financial_years ORDER BY id"
  );
  const [defaults] = await admin.query<Array<RowDataPacket & DefaultCompanyRow>>(
    "SELECT company_id,financial_year_id,landing_app,status FROM default_company_settings ORDER BY id"
  );
  return { companies, defaults, financialYears };
}

type CompanyRow = {
  code: string;
  emails_json: string;
  id: number;
  legal_name: string | null;
  name: string;
  status: string;
  tcs_available: number;
  tds_available: number;
};

type FinancialYearRow = { id: number; is_current: number; status: string };

type DefaultCompanyRow = {
  company_id: number;
  financial_year_id: number;
  landing_app: string;
  status: string;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOrganisationE2e()
    .then((result) => console.log("Organisation seed E2E passed", result))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
