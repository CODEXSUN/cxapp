import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";

export const stateSeed = {
  description: "Seed Indian states and union territories.",
  key: "core.common.location.state.seed"
};

export async function seedStateModule() {
  const countries = await sql<{
    id: number;
    code: string;
  }>`SELECT id,code FROM countries WHERE code='IN'`.execute(getCoreDatabase());
  const countryIds = new Map(countries.rows.map((country) => [country.code, country.id]));
  const indiaId = countryIds.get("IN");
  if (!indiaId) throw new Error("India country seed must exist before state seeds are applied.");

  await sql`UPDATE states AS legacy_state
    INNER JOIN countries AS legacy_country ON legacy_country.id=legacy_state.country_id
    SET legacy_state.country_id=${indiaId}
    WHERE legacy_country.code='UNKNOWN' OR legacy_country.name='-'`.execute(getCoreDatabase());

  const fallback = await sql<{ id: number }>`SELECT id FROM states
    WHERE code='UNKNOWN' OR name='-' ORDER BY id LIMIT 1`.execute(getCoreDatabase());
  if (fallback.rows[0]?.id) {
    await sql`UPDATE states SET country_id=${indiaId},code='UNKNOWN',name='-',sort_order=0,status='active'
      WHERE id=${fallback.rows[0].id}`.execute(getCoreDatabase());
  } else {
    await sql`INSERT INTO states (country_id,code,name,sort_order,status)
      VALUES (${indiaId},'UNKNOWN','-',0,'active')`.execute(getCoreDatabase());
  }

  for (const state of stateSeeds) {
    await sql`INSERT INTO states (country_id, code, name, sort_order, status)
      VALUES (${indiaId}, ${state.code}, ${state.name}, ${state.sortOrder}, ${state.status})
      ON DUPLICATE KEY UPDATE country_id=VALUES(country_id), code=VALUES(code), name=VALUES(name), sort_order=VALUES(sort_order), status=VALUES(status)`.execute(
      getCoreDatabase()
    );
  }
}

const stateSeedRows = [
  { code: "01", name: "Jammu and Kashmir", sortOrder: 1, status: "active" as const },
  { code: "02", name: "Himachal Pradesh", sortOrder: 2, status: "active" as const },
  { code: "03", name: "Punjab", sortOrder: 3, status: "active" as const },
  { code: "04", name: "Chandigarh", sortOrder: 4, status: "active" as const },
  { code: "05", name: "Uttarakhand", sortOrder: 5, status: "active" as const },
  { code: "06", name: "Haryana", sortOrder: 6, status: "active" as const },
  { code: "07", name: "Delhi", sortOrder: 7, status: "active" as const },
  { code: "08", name: "Rajasthan", sortOrder: 8, status: "active" as const },
  { code: "09", name: "Uttar Pradesh", sortOrder: 9, status: "active" as const },
  { code: "10", name: "Bihar", sortOrder: 10, status: "active" as const },
  { code: "11", name: "Sikkim", sortOrder: 11, status: "active" as const },
  { code: "12", name: "Arunachal Pradesh", sortOrder: 12, status: "active" as const },
  { code: "13", name: "Nagaland", sortOrder: 13, status: "active" as const },
  { code: "14", name: "Manipur", sortOrder: 14, status: "active" as const },
  { code: "15", name: "Mizoram", sortOrder: 15, status: "active" as const },
  { code: "16", name: "Tripura", sortOrder: 16, status: "active" as const },
  { code: "17", name: "Meghalaya", sortOrder: 17, status: "active" as const },
  { code: "18", name: "Assam", sortOrder: 18, status: "active" as const },
  { code: "19", name: "West Bengal", sortOrder: 19, status: "active" as const },
  { code: "20", name: "Jharkhand", sortOrder: 20, status: "active" as const },
  { code: "21", name: "Odisha", sortOrder: 21, status: "active" as const },
  { code: "22", name: "Chhattisgarh", sortOrder: 22, status: "active" as const },
  { code: "23", name: "Madhya Pradesh", sortOrder: 23, status: "active" as const },
  { code: "24", name: "Gujarat", sortOrder: 24, status: "active" as const },
  {
    code: "26",
    name: "Dadra and Nagar Haveli and Daman and Diu",
    sortOrder: 26,
    status: "active" as const
  },
  { code: "27", name: "Maharashtra", sortOrder: 27, status: "active" as const },
  { code: "29", name: "Karnataka", sortOrder: 29, status: "active" as const },
  { code: "30", name: "Goa", sortOrder: 30, status: "active" as const },
  { code: "31", name: "Lakshadweep", sortOrder: 31, status: "active" as const },
  { code: "32", name: "Kerala", sortOrder: 32, status: "active" as const },
  { code: "33", name: "Tamil Nadu", sortOrder: 33, status: "active" as const },
  { code: "34", name: "Puducherry", sortOrder: 34, status: "active" as const },
  { code: "35", name: "Andaman and Nicobar Islands", sortOrder: 35, status: "active" as const },
  { code: "36", name: "Telangana", sortOrder: 36, status: "active" as const },
  { code: "37", name: "Andhra Pradesh", sortOrder: 37, status: "active" as const },
  { code: "38", name: "Ladakh", sortOrder: 38, status: "active" as const },
  { code: "97", name: "Other Territory", sortOrder: 97, status: "active" as const }
];

const stateSeeds = stateSeedRows.map((state) => ({
  ...state,
  sortOrder: state.code === "33" ? 1 : state.sortOrder < 33 ? state.sortOrder + 1 : state.sortOrder
}));
