import { StorageManagerRepository } from "./storage-manager.repository.js";

export async function syncStorageManagerModule() {
  return new StorageManagerRepository().roots();
}
