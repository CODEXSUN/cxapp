import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
export async function seedContactModule() {
  await sql`
    INSERT INTO core_contacts (uuid, code, name, type_id, type_name, group_id, group_name, status)
    SELECT ${randomBytes(4).toString("hex")}, 'C-0000', 'Codexsun Demo Supplier',
      core_contact_types.id, core_contact_types.name, core_contact_groups.id, core_contact_groups.name, 'active'
    FROM core_contact_types CROSS JOIN core_contact_groups
    WHERE core_contact_types.status='active' AND core_contact_groups.status='active'
    ORDER BY CASE WHEN TRIM(core_contact_types.name)='-' THEN 0 ELSE 1 END,
      CASE WHEN TRIM(core_contact_groups.name)='-' THEN 0 ELSE 1 END,
      core_contact_types.id, core_contact_groups.id LIMIT 1
    ON DUPLICATE KEY UPDATE id=core_contacts.id
  `.execute(getCoreDatabase());
  await sql`INSERT INTO core_contacts_addresses
    (parent_id,address_type_id,address_type_name,address_line1,country_id,country_name,state_id,state_name,
     district_id,district_name,city_id,city_name,pincode_id,pincode_name,is_default,sort_order)
    SELECT core_contacts.id,core_address_types.id,core_address_types.name,'-',core_countries.id,core_countries.name,
      core_states.id,core_states.name,core_districts.id,core_districts.name,core_cities.id,core_cities.name,core_pincodes.id,core_pincodes.name,1,1
    FROM core_contacts
    CROSS JOIN core_address_types
    CROSS JOIN core_pincodes
    INNER JOIN core_cities ON core_cities.id=core_pincodes.city_id AND core_cities.status='active'
    INNER JOIN core_districts ON core_districts.id=core_cities.district_id AND core_districts.status='active'
    INNER JOIN core_states ON core_states.id=core_districts.state_id AND core_states.status='active'
    INNER JOIN core_countries ON core_countries.id=core_states.country_id AND core_countries.status='active'
    WHERE core_contacts.deleted_at IS NULL AND core_address_types.status='active' AND core_pincodes.status='active'
      AND NOT EXISTS (SELECT 1 FROM core_contacts_addresses existing WHERE existing.parent_id=core_contacts.id)
      AND core_address_types.id=(SELECT id FROM core_address_types WHERE status='active'
        ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1)
      AND core_pincodes.id=(SELECT id FROM core_pincodes WHERE status='active'
        ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1)`.execute(getCoreDatabase());
}
