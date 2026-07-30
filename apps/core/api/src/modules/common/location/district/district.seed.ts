import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";

export const districtSeed = {
  description: "Seed Tamil Nadu districts.",
  key: "core.common.location.district.seed"
};

export async function seedDistrictModule() {
  const defaultStates = await sql<{ id: number }>`SELECT states.id FROM states
    INNER JOIN countries ON countries.id = states.country_id
    WHERE countries.code='IN' AND states.code='UNKNOWN' LIMIT 1`.execute(getCoreDatabase());
  const defaultStateId = defaultStates.rows[0]?.id;
  const states = await sql<{ id: number }>`SELECT states.id FROM states
    INNER JOIN countries ON countries.id = states.country_id
    WHERE countries.code = 'IN' AND states.name = 'Tamil Nadu' LIMIT 1`.execute(getCoreDatabase());
  const tamilNaduId = states.rows[0]?.id;
  if (!defaultStateId || !tamilNaduId)
    throw new Error(
      "Default and Tamil Nadu state seeds must exist before district seeds are applied."
    );

  const fallback = await sql<{ id: number }>`SELECT id FROM districts
    WHERE name='-' ORDER BY id LIMIT 1`.execute(getCoreDatabase());
  if (fallback.rows[0]?.id) {
    await sql`UPDATE districts SET state_id=${defaultStateId},name='-',sort_order=0,status='active'
      WHERE id=${fallback.rows[0].id}`.execute(getCoreDatabase());
  } else {
    await sql`INSERT INTO districts (state_id,name,sort_order,status)
      VALUES (${defaultStateId},'-',0,'active')`.execute(getCoreDatabase());
  }

  for (const district of districtSeeds) {
    await sql`INSERT INTO districts (state_id, name, sort_order, status)
      VALUES (${tamilNaduId}, ${district.name}, ${district.sortOrder}, ${district.status})
      ON DUPLICATE KEY UPDATE state_id=VALUES(state_id), name=VALUES(name), sort_order=VALUES(sort_order), status=VALUES(status)`.execute(
      getCoreDatabase()
    );
  }
}

const districtSeeds = [
  ...[
    "Ariyalur",
    "Chengalpattu",
    "Chennai",
    "Coimbatore",
    "Cuddalore",
    "Dharmapuri",
    "Dindigul",
    "Erode",
    "Kallakurichi",
    "Kancheepuram",
    "Karur",
    "Krishnagiri",
    "Madurai",
    "Mayiladuthurai",
    "Nagapattinam",
    "Kanniyakumari",
    "Namakkal",
    "Perambalur",
    "Pudukkottai",
    "Ramanathapuram",
    "Ranipet",
    "Salem",
    "Sivaganga",
    "Tenkasi",
    "Thanjavur",
    "Theni",
    "Thoothukudi",
    "Tiruchirappalli",
    "Tirunelveli",
    "Tirupathur",
    "Tiruppur",
    "Tiruvallur",
    "Tiruvannamalai",
    "Tiruvarur",
    "Vellore",
    "Viluppuram",
    "Virudhunagar",
    "The Nilgiris"
  ].map((name, index) => ({ name, sortOrder: index + 1, status: "active" as const }))
];
