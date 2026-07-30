import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
import type { DefaultCompanyRecord, DefaultCompanySavePayload } from "./default-company.types.js";

type Row = {
  id: number | string;
  company_id: number | string;
  company_code: string;
  company_name: string;
  financial_year_id: number | string;
  financial_year_name: string;
  financial_year_start_date: string;
  financial_year_end_date: string;
  landing_app: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export class DefaultCompanyRepository {
  async get() {
    const rows =
      await sql<Row>`SELECT d.id,d.company_id,c.code AS company_code,c.name AS company_name,d.financial_year_id,f.name AS financial_year_name,DATE_FORMAT(f.start_date,'%Y-%m-%d') AS financial_year_start_date,DATE_FORMAT(f.end_date,'%Y-%m-%d') AS financial_year_end_date,d.landing_app,d.status,d.created_at,d.updated_at FROM default_company_settings d INNER JOIN companies c ON c.id=d.company_id INNER JOIN financial_years f ON f.id=d.financial_year_id WHERE d.singleton_key=1 LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? mapRow(rows.rows[0]) : null;
  }
  async save(input: DefaultCompanySavePayload) {
    const current = await this.get();
    if (current) {
      await sql`UPDATE default_company_settings SET company_id=${input.companyId},financial_year_id=${input.financialYearId},landing_app=${input.landingApp.trim()},status=${input.status ?? "active"},updated_at=CURRENT_TIMESTAMP WHERE singleton_key=1`.execute(
        getCoreDatabase()
      );
    } else {
      await sql`INSERT INTO default_company_settings (singleton_key,company_id,financial_year_id,landing_app,status) VALUES (1,${input.companyId},${input.financialYearId},${input.landingApp.trim()},${input.status ?? "active"})`.execute(
        getCoreDatabase()
      );
    }
    return (await this.get())!;
  }
  async findCompany(id: number) {
    const rows = await sql<{
      id: number | string;
      name: string;
      code: string;
    }>`SELECT id,name,code FROM companies WHERE id=${id} AND status='active' LIMIT 1`.execute(
      getCoreDatabase()
    );
    return rows.rows[0] ?? null;
  }
  async findFinancialYear(id: number) {
    const rows = await sql<{
      id: number | string;
      name: string;
    }>`SELECT id,name FROM financial_years WHERE id=${id} AND status='active' LIMIT 1`.execute(
      getCoreDatabase()
    );
    return rows.rows[0] ?? null;
  }
  async firstActiveCompany() {
    const rows = await sql<{
      id: number | string;
      name: string;
      code: string;
    }>`SELECT id,name,code FROM companies WHERE status='active' AND name<>'-' ORDER BY id LIMIT 1`.execute(
      getCoreDatabase()
    );
    const row = rows.rows[0];
    return row ? { id: Number(row.id), label: row.name, code: row.code } : null;
  }
  async currentActiveFinancialYear() {
    const rows = await sql<{
      id: number | string;
      name: string;
    }>`SELECT id,name FROM financial_years WHERE status='active' ORDER BY is_current DESC,start_date DESC,id LIMIT 1`.execute(
      getCoreDatabase()
    );
    const row = rows.rows[0];
    return row ? { id: Number(row.id), label: row.name } : null;
  }
  async companyLookups() {
    const rows = await sql<{
      id: number | string;
      name: string;
      code: string;
    }>`SELECT id,name,code FROM companies WHERE status='active' AND name<>'-' ORDER BY name`.execute(
      getCoreDatabase()
    );
    return rows.rows.map((row) => ({ id: Number(row.id), label: row.name, code: row.code }));
  }
  async financialYearLookups() {
    const rows = await sql<{
      id: number | string;
      name: string;
    }>`SELECT id,name FROM financial_years WHERE status='active' ORDER BY start_date DESC`.execute(
      getCoreDatabase()
    );
    return rows.rows.map((row) => ({ id: Number(row.id), label: row.name }));
  }
}
function mapRow(row: Row): DefaultCompanyRecord {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    companyCode: row.company_code,
    companyName: row.company_name,
    financialYearId: Number(row.financial_year_id),
    financialYearName: row.financial_year_name,
    financialYearStartDate: String(row.financial_year_start_date),
    financialYearEndDate: String(row.financial_year_end_date),
    landingApp: row.landing_app,
    status: row.status === "active" ? "active" : "inactive",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
