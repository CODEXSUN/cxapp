import { randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { getCoreDatabase, type CoreDatabase } from "../../../database/core-database.js";
import type {
  ContactAddress,
  ContactBankAccount,
  ContactEmail,
  ContactLocationReference,
  ContactPhone,
  ContactRecord,
  ContactReference,
  ContactSaveInput,
  ContactSocialLink
} from "./contact.types.js";

type Row = Record<string, unknown>;
type ContactDatabase = Kysely<CoreDatabase> | Transaction<CoreDatabase>;

export class ContactRepository {
  async createAddress(contactId: number, address: ContactAddress) {
    await getCoreDatabase()
      .insertInto("contacts_addresses" as never)
      .values({ parent_id: contactId, ...toAddressRow(address) } as never)
      .executeTakeFirst();
    return this.find(String(contactId));
  }

  async updateAddress(contactId: number, address: ContactAddress) {
    await getCoreDatabase()
      .updateTable("contacts_addresses" as never)
      .set(toAddressRow(address) as never)
      .where("id" as never, "=", address.id as never)
      .where("parent_id" as never, "=", contactId as never)
      .executeTakeFirst();
    return this.find(String(contactId));
  }

  async defaultAddress(): Promise<NonNullable<ContactSaveInput["addresses"]>[number]> {
    const result = await sql<{
      address_type_id: number | string | null;
      address_type_name: string | null;
      country_id: number | string | null;
      country_name: string | null;
      state_id: number | string | null;
      state_name: string | null;
      district_id: number | string | null;
      district_name: string | null;
      city_id: number | string | null;
      city_name: string | null;
      pincode_id: number | string | null;
      pincode_name: string | null;
    }>`SELECT
      address_types.id AS address_type_id, address_types.name AS address_type_name,
      countries.id AS country_id, countries.name AS country_name,
      states.id AS state_id, states.name AS state_name,
      districts.id AS district_id, districts.name AS district_name,
      cities.id AS city_id, cities.name AS city_name,
      pincodes.id AS pincode_id, pincodes.name AS pincode_name
      FROM pincodes
      INNER JOIN cities ON cities.id=pincodes.city_id AND cities.status='active'
      INNER JOIN districts ON districts.id=cities.district_id AND districts.status='active'
      INNER JOIN states ON states.id=districts.state_id AND states.status='active'
      INNER JOIN countries ON countries.id=states.country_id AND countries.status='active'
      CROSS JOIN address_types
      WHERE pincodes.status='active' AND address_types.status='active'
      ORDER BY
        CASE WHEN TRIM(address_types.name)='-' THEN 0 ELSE 1 END,
        CASE WHEN TRIM(pincodes.name)='-' AND TRIM(cities.name)='-' AND TRIM(districts.name)='-'
          AND TRIM(states.name)='-' AND TRIM(countries.name)='-' THEN 0 ELSE 1 END,
        address_types.id, pincodes.id
      LIMIT 1`.execute(getCoreDatabase());
    const row = result.rows[0];
    if (!row) throw new Error("Default address masters have not been seeded.");
    return {
      addressTypeId: nullableNumber(row.address_type_id),
      addressTypeName: nullableText(row.address_type_name),
      addressLine1: "-",
      addressLine2: null,
      countryId: nullableNumber(row.country_id),
      countryName: nullableText(row.country_name),
      stateId: nullableNumber(row.state_id),
      stateName: nullableText(row.state_name),
      districtId: nullableNumber(row.district_id),
      districtName: nullableText(row.district_name),
      cityId: nullableNumber(row.city_id),
      cityName: nullableText(row.city_name),
      pincodeId: nullableNumber(row.pincode_id),
      pincodeName: nullableText(row.pincode_name),
      isDefault: true
    };
  }

  async nextCode() {
    const rows = (await getCoreDatabase()
      .selectFrom("contacts" as never)
      .select(["code" as never])
      .execute()) as Row[];
    const next =
      rows.reduce((highest, row) => {
        const match = /^C[-_](\d+)$/i.exec(String(row.code ?? "").trim());
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0) + 1;
    return `C-${String(next).padStart(4, "0")}`;
  }

  async list(search = "") {
    const database = getCoreDatabase();
    let query = database
      .selectFrom("contacts" as never)
      .selectAll()
      .where("deleted_at" as never, "is", null as never)
      .orderBy("code" as never);
    if (search.trim()) {
      const like = `%${search.trim()}%`;
      query = query.where((expression) =>
        expression.or([
          expression("name" as never, "like", like as never),
          expression("code" as never, "like", like as never),
          expression("primary_phone" as never, "like", like as never),
          expression("primary_email" as never, "like", like as never)
        ])
      );
    }
    const records = ((await query.execute()) as Row[]).map(toContactRecord);
    return hydrateContactChildren(database, records);
  }

  async find(id: number | string) {
    const database = getCoreDatabase();
    const row = (await database
      .selectFrom("contacts" as never)
      .selectAll()
      .where("id" as never, "=", Number(id) as never)
      .where("deleted_at" as never, "is", null as never)
      .executeTakeFirst()) as Row | undefined;
    if (!row) return null;
    return (await hydrateContactChildren(database, [toContactRecord(row)]))[0] ?? null;
  }

  async findByCode(code: string, excludingId?: number) {
    const database = getCoreDatabase();
    let query = database
      .selectFrom("contacts" as never)
      .select(["id" as never])
      .where("code" as never, "=", code as never)
      .where("deleted_at" as never, "is", null as never);
    if (excludingId) query = query.where("id" as never, "!=", excludingId as never);
    return Boolean(await query.executeTakeFirst());
  }

  async create(input: ContactSaveInput) {
    const draft = normalizeContact(input, null);
    const database = getCoreDatabase();
    const id = await database.transaction().execute(async (transaction) => {
      const result = await transaction
        .insertInto("contacts" as never)
        .values(toContactRow(draft) as never)
        .executeTakeFirst();
      const contactId = Number(result.insertId);
      await replaceContactChildren(transaction, contactId, draft);
      return contactId;
    });
    return requiredContact(await this.find(id));
  }

  async update(id: number | string, input: ContactSaveInput) {
    const numericId = Number(id);
    const current = await this.find(numericId);
    if (!current || isProtectedContact(current)) return null;
    const draft = normalizeContact(input, current);
    const database = getCoreDatabase();
    await database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("contacts" as never)
        .set(toContactRow(draft) as never)
        .where("id" as never, "=", numericId as never)
        .execute();
      await replaceContactChildren(transaction, numericId, draft);
    });
    return requiredContact(await this.find(numericId));
  }

  async setActive(id: number | string, isActive: boolean) {
    const current = await this.find(id);
    if (!current || isProtectedContact(current)) return null;
    await getCoreDatabase()
      .updateTable("contacts" as never)
      .set({ status: isActive ? "active" : "suspend" } as never)
      .where("id" as never, "=", Number(id) as never)
      .execute();
    return this.find(id);
  }

  async forceDelete(id: number | string) {
    const current = await this.find(id);
    if (!current || isProtectedContact(current)) return null;
    await getCoreDatabase()
      .updateTable("contacts" as never)
      .set({ deleted_at: new Date(), status: "deleted" } as never)
      .where("id" as never, "=", Number(id) as never)
      .execute();
    return current;
  }

  async findContactType(id: number): Promise<ContactReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("contact_types" as never)
      .select(["id" as never, "name" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  async findContactGroup(id: number): Promise<ContactReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("contact_groups" as never)
      .select(["id" as never, "name" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  async findAddressType(id: number): Promise<ContactReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("address_types" as never)
      .select(["id" as never, "name" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  async findBankName(id: number): Promise<ContactReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("bank_names" as never)
      .select(["id" as never, "name" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  async findCountry(id: number): Promise<ContactReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("countries" as never)
      .select(["id" as never, "name" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row ? { id: Number(row.id), name: String(row.name) } : null;
  }

  async findState(id: number): Promise<ContactLocationReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("states" as never)
      .select(["id" as never, "name" as never, "country_id" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row
      ? { id: Number(row.id), name: String(row.name), parentId: nullableNumber(row.country_id) }
      : null;
  }

  async findDistrict(id: number): Promise<ContactLocationReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("districts" as never)
      .select(["id" as never, "name" as never, "state_id" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row
      ? { id: Number(row.id), name: String(row.name), parentId: nullableNumber(row.state_id) }
      : null;
  }

  async findCity(id: number): Promise<ContactLocationReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("cities" as never)
      .select(["id" as never, "name" as never, "district_id" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row
      ? { id: Number(row.id), name: String(row.name), parentId: nullableNumber(row.district_id) }
      : null;
  }

  async findPincode(id: number): Promise<ContactLocationReference | null> {
    const row = (await getCoreDatabase()
      .selectFrom("pincodes" as never)
      .select(["id" as never, "name" as never, "city_id" as never])
      .where("id" as never, "=", id as never)
      .where("status" as never, "=", "active" as never)
      .executeTakeFirst()) as Row | undefined;
    return row
      ? { id: Number(row.id), name: String(row.name), parentId: nullableNumber(row.city_id) }
      : null;
  }
}

function requiredContact(record: ContactRecord | null) {
  if (!record) throw new Error("Contact could not be loaded after it was saved.");
  return record;
}

function isProtectedContact(record: ContactRecord) {
  return record.name.trim() === "-";
}

function normalizeContact(input: ContactSaveInput, current: ContactRecord | null): ContactRecord {
  const now = new Date().toISOString();
  const name = text(input.name ?? current?.name);
  if (!name) throw new Error("Contact name is required.");
  const status = input.isActive === false ? "suspend" : (input.status ?? "active");
  const emails = normalizeEmails(input.emails ?? current?.emails ?? []);
  const phones = normalizePhones(input.phones ?? current?.phones ?? []);
  return {
    id: current?.id ?? 0,
    uuid: current?.uuid ?? randomBytes(4).toString("hex"),
    code: text(input.code ?? current?.code) || codeFromName(name),
    name,
    legalName: nullableText(input.legalName ?? current?.legalName),
    typeId: Number(input.typeId ?? current?.typeId),
    typeName: nullableText(input.typeName ?? current?.typeName),
    groupId: nullableNumber(input.groupId ?? current?.groupId),
    groupName: nullableText(input.groupName ?? current?.groupName),
    primaryPhone: nullableText(primaryValue(phones, "phone")),
    primaryEmail: nullableText(primaryValue(emails, "email")),
    gstin: nullableText(input.gstin ?? current?.gstin)?.toUpperCase() ?? null,
    pan: nullableText(input.pan ?? current?.pan)?.toUpperCase() ?? null,
    msmeNo: nullableText(input.msmeNo ?? current?.msmeNo),
    msmeCategory: nullableText(input.msmeCategory ?? current?.msmeCategory),
    tanNo: nullableText(input.tanNo ?? current?.tanNo)?.toUpperCase() ?? null,
    tdsAvailable: booleanValue(input.tdsAvailable ?? current?.tdsAvailable),
    tcsAvailable: booleanValue(input.tcsAvailable ?? current?.tcsAvailable),
    openingBalance: numberValue(input.openingBalance ?? current?.openingBalance),
    creditLimit: numberValue(input.creditLimit ?? current?.creditLimit),
    website: nullableText(input.website ?? current?.website),
    description: nullableText(input.description ?? current?.description),
    status,
    isActive: status === "active",
    emails,
    phones,
    addresses: normalizeAddresses(input.addresses ?? current?.addresses ?? [], current?.addresses),
    bankAccounts: normalizeBankAccounts(input.bankAccounts ?? current?.bankAccounts ?? []),
    socialLinks: normalizeSocialLinks(input.socialLinks ?? current?.socialLinks ?? []),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    deletedAt: current?.deletedAt ?? null
  };
}

function normalizeEmails(items: ContactSaveInput["emails"] | ContactEmail[]) {
  const normalized = (items ?? [])
    .map((item, index) => ({
      id: Number(item.id ?? 0),
      email: text(item.email).toLowerCase(),
      emailType: text(item.emailType) || "Primary",
      isPrimary: booleanValue(item.isPrimary),
      sortOrder: index + 1
    }))
    .filter((item) => item.email);
  ensureOnePrimary(normalized);
  return normalized;
}

function normalizePhones(items: ContactSaveInput["phones"] | ContactPhone[]) {
  const normalized = (items ?? [])
    .map((item, index) => ({
      id: Number(item.id ?? 0),
      phone: text(item.phone),
      phoneType: text(item.phoneType) || "Mobile",
      isPrimary: booleanValue(item.isPrimary),
      sortOrder: index + 1
    }))
    .filter((item) => item.phone);
  ensureOnePrimary(normalized);
  return normalized;
}

function normalizeAddresses(
  items: ContactSaveInput["addresses"] | ContactAddress[],
  current: ContactAddress[] = []
) {
  const normalized = (items ?? [])
    .map((item, index) => ({
      id: Number(item.id ?? current[index]?.id ?? 0),
      addressTypeId: nullableNumber(item.addressTypeId),
      addressTypeName: nullableText(item.addressTypeName),
      addressLine1: text(item.addressLine1),
      addressLine2: nullableText(item.addressLine2),
      countryId: nullableNumber(item.countryId),
      countryName: nullableText(item.countryName),
      stateId: nullableNumber(item.stateId),
      stateName: nullableText(item.stateName),
      districtId: nullableNumber(item.districtId),
      districtName: nullableText(item.districtName),
      cityId: nullableNumber(item.cityId),
      cityName: nullableText(item.cityName),
      pincodeId: nullableNumber(item.pincodeId),
      pincodeName: nullableText(item.pincodeName),
      isDefault: booleanValue(item.isDefault),
      sortOrder: index + 1
    }))
    .filter(hasAddressValue);
  ensureOnePrimary(normalized, "isDefault");
  return normalized;
}

function hasAddressValue(item: ContactAddress) {
  return Boolean(
    item.addressTypeId ||
    item.addressLine1 ||
    item.addressLine2 ||
    item.countryId ||
    item.stateId ||
    item.districtId ||
    item.cityId ||
    item.pincodeId
  );
}

function normalizeBankAccounts(items: ContactSaveInput["bankAccounts"] | ContactBankAccount[]) {
  const normalized = (items ?? [])
    .map((item, index) => ({
      id: Number(item.id ?? 0),
      bankNameId: nullableNumber(item.bankNameId),
      bankName: nullableText(item.bankName),
      accountType: nullableText(item.accountType),
      accountNumber: text(item.accountNumber),
      holderName: nullableText(item.holderName),
      ifsc: nullableText(item.ifsc)?.toUpperCase() ?? null,
      branch: nullableText(item.branch),
      isPrimary: booleanValue(item.isPrimary),
      sortOrder: index + 1
    }))
    .filter((item) => item.accountNumber);
  ensureOnePrimary(normalized);
  return normalized;
}

function normalizeSocialLinks(items: ContactSaveInput["socialLinks"] | ContactSocialLink[]) {
  return (items ?? [])
    .map((item, index) => {
      const isActive = booleanValue(item.isActive ?? item.status === "active");
      return {
        id: Number(item.id ?? 0),
        platform: text(item.platform) || "Website",
        url: text(item.url),
        status: isActive ? ("active" as const) : ("inactive" as const),
        isActive,
        sortOrder: index + 1
      };
    })
    .filter((item) => item.url);
}

function ensureOnePrimary<T extends Record<string, unknown>>(
  items: T[],
  key: "isDefault" | "isPrimary" = "isPrimary"
) {
  if (!items.length) return;
  const selected = Math.max(
    0,
    items.findIndex((item) => booleanValue(item[key]))
  );
  items.forEach((item, index) => {
    (item as Record<string, unknown>)[key] = index === selected;
  });
}

function toContactRow(record: ContactRecord) {
  return {
    uuid: record.uuid,
    code: record.code,
    name: record.name,
    legal_name: record.legalName,
    type_id: record.typeId,
    type_name: record.typeName,
    group_id: record.groupId,
    group_name: record.groupName,
    primary_phone: record.primaryPhone,
    primary_email: record.primaryEmail,
    gstin: record.gstin,
    pan: record.pan,
    msme_no: record.msmeNo,
    msme_category: record.msmeCategory,
    tan_no: record.tanNo,
    tds_available: record.tdsAvailable ? 1 : 0,
    tcs_available: record.tcsAvailable ? 1 : 0,
    opening_balance: record.openingBalance,
    credit_limit: record.creditLimit,
    website: record.website,
    description: record.description,
    status: record.status,
    updated_at: new Date(record.updatedAt)
  };
}

function toContactRecord(row: Row): ContactRecord {
  const status = String(row.status ?? "active") as ContactRecord["status"];
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    code: String(row.code),
    name: String(row.name),
    legalName: nullableText(row.legal_name),
    typeId: nullableNumber(row.type_id),
    typeName: nullableText(row.type_name),
    groupId: nullableNumber(row.group_id),
    groupName: nullableText(row.group_name),
    primaryPhone: nullableText(row.primary_phone),
    primaryEmail: nullableText(row.primary_email),
    gstin: nullableText(row.gstin),
    pan: nullableText(row.pan),
    msmeNo: nullableText(row.msme_no),
    msmeCategory: nullableText(row.msme_category),
    tanNo: nullableText(row.tan_no),
    tdsAvailable: booleanValue(row.tds_available),
    tcsAvailable: booleanValue(row.tcs_available),
    openingBalance: numberValue(row.opening_balance),
    creditLimit: numberValue(row.credit_limit),
    website: nullableText(row.website),
    description: nullableText(row.description),
    status,
    isActive: status === "active",
    emails: [],
    phones: [],
    addresses: [],
    bankAccounts: [],
    socialLinks: [],
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
    deletedAt: nullableDateValue(row.deleted_at)
  };
}

async function hydrateContactChildren(database: ContactDatabase, records: ContactRecord[]) {
  if (!records.length) return records;
  const ids = records.map(({ id }) => id);
  const [emails, phones, addresses, bankAccounts, socialLinks] = await Promise.all([
    database
      .selectFrom("contacts_emails" as never)
      .selectAll()
      .where("parent_id" as never, "in", ids as never)
      .orderBy("sort_order" as never)
      .execute() as Promise<Row[]>,
    database
      .selectFrom("contacts_phones" as never)
      .selectAll()
      .where("parent_id" as never, "in", ids as never)
      .orderBy("sort_order" as never)
      .execute() as Promise<Row[]>,
    database
      .selectFrom("contacts_addresses" as never)
      .selectAll()
      .where("parent_id" as never, "in", ids as never)
      .orderBy("sort_order" as never)
      .execute() as Promise<Row[]>,
    database
      .selectFrom("contacts_bank_accounts" as never)
      .selectAll()
      .where("parent_id" as never, "in", ids as never)
      .orderBy("sort_order" as never)
      .execute() as Promise<Row[]>,
    database
      .selectFrom("contacts_social_links" as never)
      .selectAll()
      .where("parent_id" as never, "in", ids as never)
      .orderBy("sort_order" as never)
      .execute() as Promise<Row[]>
  ]);
  return records.map((record) => ({
    ...record,
    emails: emails.filter(parent(record.id)).map(toEmail),
    phones: phones.filter(parent(record.id)).map(toPhone),
    addresses: addresses.filter(parent(record.id)).map(toAddress),
    bankAccounts: bankAccounts.filter(parent(record.id)).map(toBankAccount),
    socialLinks: socialLinks.filter(parent(record.id)).map(toSocialLink)
  }));
}

function parent(id: number) {
  return (row: Row) => Number(row.parent_id) === id;
}

function toEmail(row: Row): ContactEmail {
  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
    emailType: String(row.email_type ?? "Primary"),
    isPrimary: booleanValue(row.is_primary),
    sortOrder: Number(row.sort_order ?? 1)
  };
}

function toPhone(row: Row): ContactPhone {
  return {
    id: Number(row.id),
    phone: String(row.phone ?? ""),
    phoneType: String(row.phone_type ?? "Mobile"),
    isPrimary: booleanValue(row.is_primary),
    sortOrder: Number(row.sort_order ?? 1)
  };
}

function toAddress(row: Row): ContactAddress {
  return {
    id: Number(row.id),
    addressTypeId: nullableNumber(row.address_type_id),
    addressTypeName: nullableText(row.address_type_name),
    addressLine1: String(row.address_line1 ?? ""),
    addressLine2: nullableText(row.address_line2),
    countryId: nullableNumber(row.country_id),
    countryName: nullableText(row.country_name),
    stateId: nullableNumber(row.state_id),
    stateName: nullableText(row.state_name),
    districtId: nullableNumber(row.district_id),
    districtName: nullableText(row.district_name),
    cityId: nullableNumber(row.city_id),
    cityName: nullableText(row.city_name),
    pincodeId: nullableNumber(row.pincode_id),
    pincodeName: nullableText(row.pincode_name),
    isDefault: booleanValue(row.is_default),
    sortOrder: Number(row.sort_order ?? 1)
  };
}

function toBankAccount(row: Row): ContactBankAccount {
  return {
    id: Number(row.id),
    bankNameId: nullableNumber(row.bank_name_id),
    bankName: nullableText(row.bank_name),
    accountType: nullableText(row.account_type),
    accountNumber: String(row.account_number ?? ""),
    holderName: nullableText(row.holder_name),
    ifsc: nullableText(row.ifsc),
    branch: nullableText(row.branch),
    isPrimary: booleanValue(row.is_primary),
    sortOrder: Number(row.sort_order ?? 1)
  };
}

function toSocialLink(row: Row): ContactSocialLink {
  const status = String(row.status) === "inactive" ? "inactive" : "active";
  return {
    id: Number(row.id),
    platform: String(row.platform ?? "Website"),
    url: String(row.url ?? ""),
    status,
    isActive: status === "active",
    sortOrder: Number(row.sort_order ?? 1)
  };
}

async function replaceContactChildren(
  database: ContactDatabase,
  contactId: number,
  record: ContactRecord
) {
  await database
    .deleteFrom("contacts_emails" as never)
    .where("parent_id" as never, "=", contactId as never)
    .execute();
  await database
    .deleteFrom("contacts_phones" as never)
    .where("parent_id" as never, "=", contactId as never)
    .execute();
  await database
    .deleteFrom("contacts_bank_accounts" as never)
    .where("parent_id" as never, "=", contactId as never)
    .execute();
  await database
    .deleteFrom("contacts_social_links" as never)
    .where("parent_id" as never, "=", contactId as never)
    .execute();

  if (record.emails.length) {
    await database
      .insertInto("contacts_emails" as never)
      .values(
        record.emails.map((item) => ({
          parent_id: contactId,
          email: item.email,
          email_type: item.emailType,
          is_primary: item.isPrimary ? 1 : 0,
          sort_order: item.sortOrder
        })) as never
      )
      .execute();
  }
  if (record.phones.length) {
    await database
      .insertInto("contacts_phones" as never)
      .values(
        record.phones.map((item) => ({
          parent_id: contactId,
          phone: item.phone,
          phone_type: item.phoneType,
          is_primary: item.isPrimary ? 1 : 0,
          sort_order: item.sortOrder
        })) as never
      )
      .execute();
  }
  await syncContactAddresses(database, contactId, record.addresses);
  if (record.bankAccounts.length) {
    await database
      .insertInto("contacts_bank_accounts" as never)
      .values(
        record.bankAccounts.map((item) => ({
          parent_id: contactId,
          bank_name_id: item.bankNameId,
          bank_name: item.bankName,
          account_type: item.accountType,
          account_number: item.accountNumber,
          holder_name: item.holderName,
          ifsc: item.ifsc,
          branch: item.branch,
          is_primary: item.isPrimary ? 1 : 0,
          sort_order: item.sortOrder
        })) as never
      )
      .execute();
  }
  if (record.socialLinks.length) {
    await database
      .insertInto("contacts_social_links" as never)
      .values(
        record.socialLinks.map((item) => ({
          parent_id: contactId,
          platform: item.platform,
          url: item.url,
          status: item.status,
          sort_order: item.sortOrder
        })) as never
      )
      .execute();
  }
}

async function syncContactAddresses(
  database: ContactDatabase,
  contactId: number,
  addresses: ContactAddress[]
) {
  const existingRows = (await database
    .selectFrom("contacts_addresses" as never)
    .select(["id" as never])
    .where("parent_id" as never, "=", contactId as never)
    .execute()) as Row[];
  const existingIds = new Set(existingRows.map((row) => Number(row.id)));
  const retainedIds = addresses
    .map((address) => Number(address.id))
    .filter((id) => id > 0 && existingIds.has(id));
  const retainedIdSet = new Set(retainedIds);

  for (const address of addresses) {
    if (!retainedIdSet.has(Number(address.id))) continue;
    await database
      .updateTable("contacts_addresses" as never)
      .set(toAddressRow(address) as never)
      .where("id" as never, "=", Number(address.id) as never)
      .where("parent_id" as never, "=", contactId as never)
      .execute();
  }

  let deleteQuery = database
    .deleteFrom("contacts_addresses" as never)
    .where("parent_id" as never, "=", contactId as never);
  if (retainedIds.length) {
    deleteQuery = deleteQuery.where("id" as never, "not in", retainedIds as never);
  }
  await deleteQuery.execute();

  const newAddresses = addresses.filter((address) => !retainedIdSet.has(Number(address.id)));
  if (newAddresses.length) {
    await database
      .insertInto("contacts_addresses" as never)
      .values(
        newAddresses.map((address) => ({
          parent_id: contactId,
          ...toAddressRow(address)
        })) as never
      )
      .execute();
  }
}

function toAddressRow(address: ContactAddress) {
  return {
    address_type_id: address.addressTypeId,
    address_type_name: address.addressTypeName,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    country_id: address.countryId,
    country_name: address.countryName,
    state_id: address.stateId,
    state_name: address.stateName,
    district_id: address.districtId,
    district_name: address.districtName,
    city_id: address.cityId,
    city_name: address.cityName,
    pincode_id: address.pincodeId,
    pincode_name: address.pincodeName,
    is_default: address.isDefault ? 1 : 0,
    sort_order: address.sortOrder
  };
}

function primaryValue<T extends { isPrimary: boolean }>(items: T[], key: keyof T) {
  return items.find((item) => item.isPrimary)?.[key] ?? items[0]?.[key] ?? null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function numberValue(value: unknown) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function dateValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value ?? new Date().toISOString());
}

function nullableDateValue(value: unknown) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function codeFromName(name: string) {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `CONTACT-${Date.now()}`
  );
}
