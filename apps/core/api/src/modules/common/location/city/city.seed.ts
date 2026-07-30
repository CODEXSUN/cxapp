import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";

export const citySeed = {
  description: "Seed Tamil Nadu cities.",
  key: "core.common.location.city.seed"
};

export async function seedCityModule() {
  const defaultDistricts = await sql<{ id: number }>`SELECT districts.id FROM districts
    INNER JOIN states ON states.id=districts.state_id
    INNER JOIN countries ON countries.id=states.country_id
    WHERE countries.code='IN' AND states.code='UNKNOWN' AND districts.name='-'
    LIMIT 1`.execute(getCoreDatabase());
  const defaultDistrictId = defaultDistricts.rows[0]?.id;
  const rows = await sql<{
    id: number;
    name: string;
  }>`SELECT districts.id, districts.name FROM districts
    INNER JOIN states ON states.id = districts.state_id
    INNER JOIN countries ON countries.id = states.country_id
    WHERE countries.code = 'IN' AND states.name = 'Tamil Nadu'`.execute(getCoreDatabase());
  const districtIds = new Map(rows.rows.map((row) => [row.name, row.id]));
  if (!defaultDistrictId)
    throw new Error("Default district seed must exist before city seeds are applied.");

  const fallback = await sql<{ id: number }>`SELECT id FROM cities
    WHERE name='-' ORDER BY id LIMIT 1`.execute(getCoreDatabase());
  if (fallback.rows[0]?.id) {
    await sql`UPDATE cities SET district_id=${defaultDistrictId},name='-',sort_order=0,status='active'
      WHERE id=${fallback.rows[0].id}`.execute(getCoreDatabase());
  } else {
    await sql`INSERT INTO cities (district_id,name,sort_order,status)
      VALUES (${defaultDistrictId},'-',0,'active')`.execute(getCoreDatabase());
  }

  for (const city of citySeeds) {
    const districtId = districtIds.get(city.districtName);
    if (!districtId)
      throw new Error(`District seed must exist before city seed is applied: ${city.districtName}`);
    await sql`INSERT INTO cities (district_id, name, sort_order, status)
      VALUES (${districtId}, ${city.name}, ${city.sortOrder}, ${city.status})
      ON DUPLICATE KEY UPDATE district_id=VALUES(district_id), name=VALUES(name), sort_order=VALUES(sort_order), status=VALUES(status)`.execute(
      getCoreDatabase()
    );
  }
}

const citySeeds = [
  { name: "Chennai", districtName: "Chennai", sortOrder: 1, status: "active" as const },
  { name: "Coimbatore", districtName: "Coimbatore", sortOrder: 2, status: "active" as const },
  { name: "Tiruppur", districtName: "Tiruppur", sortOrder: 3, status: "active" as const },
  { name: "Madurai", districtName: "Madurai", sortOrder: 4, status: "active" as const },
  { name: "Salem", districtName: "Salem", sortOrder: 5, status: "active" as const },
  { name: "Erode", districtName: "Erode", sortOrder: 6, status: "active" as const },
  {
    name: "Tiruchirappalli",
    districtName: "Tiruchirappalli",
    sortOrder: 7,
    status: "active" as const
  },
  { name: "Tirunelveli", districtName: "Tirunelveli", sortOrder: 8, status: "active" as const },
  { name: "Thoothukudi", districtName: "Thoothukudi", sortOrder: 9, status: "active" as const },
  { name: "Vellore", districtName: "Vellore", sortOrder: 10, status: "active" as const },
  { name: "Hosur", districtName: "Krishnagiri", sortOrder: 11, status: "active" as const },
  { name: "Nagercoil", districtName: "Kanniyakumari", sortOrder: 12, status: "active" as const },
  { name: "Thanjavur", districtName: "Thanjavur", sortOrder: 13, status: "active" as const },
  { name: "Dindigul", districtName: "Dindigul", sortOrder: 14, status: "active" as const },
  { name: "Karur", districtName: "Karur", sortOrder: 15, status: "active" as const },
  { name: "Namakkal", districtName: "Namakkal", sortOrder: 16, status: "active" as const },
  { name: "Cuddalore", districtName: "Cuddalore", sortOrder: 17, status: "active" as const },
  { name: "Kancheepuram", districtName: "Kancheepuram", sortOrder: 18, status: "active" as const },
  { name: "Tiruvallur", districtName: "Tiruvallur", sortOrder: 19, status: "active" as const },
  { name: "Udumalpet", districtName: "Tiruppur", sortOrder: 20, status: "active" as const },
  { name: "Pollachi", districtName: "Coimbatore", sortOrder: 21, status: "active" as const },
  { name: "Avinashi", districtName: "Tiruppur", sortOrder: 22, status: "active" as const }
];
