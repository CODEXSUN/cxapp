import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { StorageManagerRepository } from "./storage-manager.repository.js";

export async function seedStorageManagerModule(_database: Kysely<PlatformDatabase>) {
  await new StorageManagerRepository().roots();
  return { seeded: 1, storage: "root-and-tenant-folders-ready" } as const;
}
