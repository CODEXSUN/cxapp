import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
export async function seedContactModule() {
  await sql`UPDATE contacts_addresses AS address
    INNER JOIN countries AS current_country ON current_country.id=address.country_id
    INNER JOIN countries AS india ON india.code='IN'
    SET address.country_id=india.id,address.country_name=india.name
    WHERE current_country.code='UNKNOWN' OR current_country.name='-'`.execute(getCoreDatabase());
  await sql`UPDATE contacts AS legacy
    LEFT JOIN contacts AS canonical
      ON canonical.id<>legacy.id AND canonical.code=REPLACE(legacy.code, '_', '-')
    SET legacy.code=REPLACE(legacy.code, '_', '-')
    WHERE legacy.code REGEXP '^C_[0-9]+$' AND canonical.id IS NULL`.execute(getCoreDatabase());
  await sql`
    INSERT INTO contacts (uuid, code, name, type_id, type_name, group_id, group_name, status)
    SELECT ${randomBytes(4).toString("hex")}, 'C-0000', 'Codexsun Demo Supplier',
      contact_types.id, contact_types.name, contact_groups.id, contact_groups.name, 'active'
    FROM contact_types CROSS JOIN contact_groups
    WHERE contact_types.status='active' AND contact_groups.status='active'
    ORDER BY CASE WHEN TRIM(contact_types.name)='-' THEN 0 ELSE 1 END,
      CASE WHEN TRIM(contact_groups.name)='-' THEN 0 ELSE 1 END,
      contact_types.id, contact_groups.id LIMIT 1
    ON DUPLICATE KEY UPDATE name=VALUES(name), type_id=COALESCE(type_id,VALUES(type_id)),
      type_name=COALESCE(type_name,VALUES(type_name)), group_id=COALESCE(group_id,VALUES(group_id)),
      group_name=COALESCE(group_name,VALUES(group_name)), status='active'
  `.execute(getCoreDatabase());
  await sql`INSERT INTO contacts_addresses
    (parent_id,address_type_id,address_type_name,address_line1,country_id,country_name,state_id,state_name,
     district_id,district_name,city_id,city_name,pincode_id,pincode_name,is_default,sort_order)
    SELECT contacts.id,address_types.id,address_types.name,'-',countries.id,countries.name,
      states.id,states.name,districts.id,districts.name,cities.id,cities.name,pincodes.id,pincodes.name,1,1
    FROM contacts
    CROSS JOIN address_types
    CROSS JOIN pincodes
    INNER JOIN cities ON cities.id=pincodes.city_id AND cities.status='active'
    INNER JOIN districts ON districts.id=cities.district_id AND districts.status='active'
    INNER JOIN states ON states.id=districts.state_id AND states.status='active'
    INNER JOIN countries ON countries.id=states.country_id AND countries.status='active'
    WHERE contacts.deleted_at IS NULL AND address_types.status='active' AND pincodes.status='active'
      AND NOT EXISTS (SELECT 1 FROM contacts_addresses existing WHERE existing.parent_id=contacts.id)
      AND address_types.id=(SELECT id FROM address_types WHERE status='active'
        ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1)
      AND pincodes.id=(SELECT id FROM pincodes WHERE status='active'
        ORDER BY CASE WHEN TRIM(name)='-' THEN 0 ELSE 1 END,id LIMIT 1)`.execute(getCoreDatabase());
}
