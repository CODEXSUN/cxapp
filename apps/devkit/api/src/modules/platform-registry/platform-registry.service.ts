import { randomBytes } from "node:crypto";
import { AppError } from "@cxapp/framework/errors";
import { PlatformRegistryRepository } from "./platform-registry.repository.js";
import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform,
  PlatformRegistryResult,
  PlatformRegistrySavePayload,
  PlatformRegistryUpdatePayload
} from "./platform-registry.types.js";

export class PlatformRegistryService {
  constructor(private readonly repository = new PlatformRegistryRepository()) {}

  async registryResult(): Promise<PlatformRegistryResult> {
    const [platforms, groups, modules] = await Promise.all([
      this.repository.listRegistryPlatforms(),
      this.repository.listRegistryGroups(),
      this.repository.listRegistryModules()
    ]);
    return {
      generatedAt: now(),
      platforms: platforms.map((platform) => ({
        ...platform,
        groups: groupTree(groups, modules, platform.id, "")
      })),
      summary: {
        activeGroups: groups.filter((group) => group.active).length,
        activeModules: modules.filter((module) => module.active).length,
        platforms: platforms.length,
        totalGroups: groups.length,
        totalModules: modules.length
      }
    };
  }

  listRegistryPlatforms() {
    return this.repository.listRegistryPlatforms();
  }

  async createRegistryPlatform(input: PlatformRegistrySavePayload, actorEmail: string) {
    const record = normalizePlatform({ ...input, id: newUuid() });
    if (await this.repository.registryPlatformKeyExists(record.key)) {
      throw AppError.conflict("Platform key already exists.");
    }
    return this.repository.createRegistryPlatform(record, actorEmail);
  }

  async updateRegistryPlatform(
    id: string,
    input: PlatformRegistryUpdatePayload,
    actorEmail: string
  ) {
    const current = await this.repository.findRegistryPlatform(id);
    if (!current) throw AppError.notFound("Platform registry record was not found.");
    const next = normalizePlatform({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    if (await this.repository.registryPlatformKeyExists(next.key, id)) {
      throw AppError.conflict("Platform key already exists.");
    }
    return this.repository.updateRegistryPlatform(next, actorEmail);
  }

  listRegistryGroups() {
    return this.repository.listRegistryGroups();
  }

  async createRegistryGroup(input: PlatformRegistrySavePayload, actorEmail: string) {
    const record = normalizeGroup({ ...input, id: newUuid() });
    await this.validateGroupParents(record);
    if (await this.repository.registryGroupKeyExists(record.key)) {
      throw AppError.conflict("Module group key already exists.");
    }
    return this.repository.createRegistryGroup(record, actorEmail);
  }

  async updateRegistryGroup(id: string, input: PlatformRegistryUpdatePayload, actorEmail: string) {
    const current = await this.repository.findRegistryGroup(id);
    if (!current) throw AppError.notFound("Module group registry record was not found.");
    const next = normalizeGroup({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    await this.validateGroupParents(next);
    if (await this.repository.registryGroupKeyExists(next.key, id)) {
      throw AppError.conflict("Module group key already exists.");
    }
    return this.repository.updateRegistryGroup(next, actorEmail);
  }

  listRegistryModules() {
    return this.repository.listRegistryModules();
  }

  async createRegistryModule(input: PlatformRegistrySavePayload, actorEmail: string) {
    const record = normalizeModule({ ...input, id: newUuid() });
    await this.validateModuleParents(record);
    if (await this.repository.registryModuleKeyExists(record.key)) {
      throw AppError.conflict("Module key already exists.");
    }
    return this.repository.createRegistryModule(record, actorEmail);
  }

  async updateRegistryModule(id: string, input: PlatformRegistryUpdatePayload, actorEmail: string) {
    const current = await this.repository.findRegistryModule(id);
    if (!current) throw AppError.notFound("Module registry record was not found.");
    const next = normalizeModule({
      ...current,
      ...withoutUndefined(input),
      id,
      updatedAt: now()
    });
    await this.validateModuleParents(next);
    if (await this.repository.registryModuleKeyExists(next.key, id)) {
      throw AppError.conflict("Module key already exists.");
    }
    return this.repository.updateRegistryModule(next, actorEmail);
  }

  async setRegistryActive(
    kind: "groups" | "modules" | "platforms",
    id: string,
    active: boolean,
    actorEmail: string
  ) {
    if (kind === "platforms") {
      return this.updateRegistryPlatform(id, { active }, actorEmail);
    }
    if (kind === "groups") return this.updateRegistryGroup(id, { active }, actorEmail);
    return this.updateRegistryModule(id, { active }, actorEmail);
  }

  private async validateGroupParents(record: PlatformRegistryGroup) {
    const platform = await this.repository.findRegistryPlatform(record.platformId);
    if (!platform) throw AppError.validation("Selected Platform does not exist.");
    let parentId = record.parentGroupId;
    const visited = new Set<string>();
    while (parentId) {
      if (parentId === record.id || visited.has(parentId)) {
        throw AppError.validation("Module group parent selection would create a cycle.");
      }
      visited.add(parentId);
      const parent = await this.repository.findRegistryGroup(parentId);
      if (!parent || parent.platformId !== record.platformId) {
        throw AppError.validation("Selected parent group does not belong to this Platform.");
      }
      parentId = parent.parentGroupId;
    }
  }

  private async validateModuleParents(record: PlatformRegistryModule) {
    const group = await this.repository.findRegistryGroup(record.groupId);
    if (!group) throw AppError.validation("Selected module group does not exist.");
    let parentId = record.parentModuleId;
    const visited = new Set<string>();
    while (parentId) {
      if (parentId === record.id || visited.has(parentId)) {
        throw AppError.validation("Module parent selection would create a cycle.");
      }
      visited.add(parentId);
      const parent = await this.repository.findRegistryModule(parentId);
      if (!parent || parent.groupId !== record.groupId) {
        throw AppError.validation("Selected parent module does not belong to this group.");
      }
      parentId = parent.parentModuleId;
    }
  }
}

function normalizePlatform(
  input: OptionalPlatformInput & PlatformRegistrySavePayload
): PlatformRegistryPlatform {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    name: required(input.name, "name"),
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizeGroup(
  input: OptionalGroupInput & PlatformRegistrySavePayload
): PlatformRegistryGroup {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    name: required(input.name, "name"),
    parentGroupId: input.parentGroupId ?? "",
    platformId: required(input.platformId, "platformId"),
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizeModule(
  input: OptionalModuleInput & PlatformRegistrySavePayload
): PlatformRegistryModule {
  const timestamp = now();
  return {
    active: input.active ?? true,
    createdAt: input.createdAt ?? timestamp,
    description: input.description ?? "",
    documentation: input.documentation ?? {},
    groupId: required(input.groupId, "groupId"),
    id: required(input.id, "id"),
    key: required(input.key, "key"),
    moduleType: input.moduleType ?? "module",
    name: required(input.name, "name"),
    parentModuleId: input.parentModuleId ?? "",
    planningNotes: input.planningNotes ?? [],
    routePath: input.routePath ?? "",
    sortOrder: Number(input.sortOrder ?? 0),
    status: input.status ?? "active",
    updatedAt: input.updatedAt ?? timestamp
  };
}

function groupTree(
  groups: PlatformRegistryGroup[],
  modules: PlatformRegistryModule[],
  platformId: string,
  parentGroupId: string
): PlatformRegistryResult["platforms"][number]["groups"] {
  return groups
    .filter((group) => group.platformId === platformId && group.parentGroupId === parentGroupId)
    .map((group) => ({
      ...group,
      modules: moduleTree(modules, group.id, ""),
      subGroups: groupTree(groups, modules, platformId, group.id)
    }));
}

function moduleTree(
  modules: PlatformRegistryModule[],
  groupId: string,
  parentModuleId: string
): PlatformRegistryResult["platforms"][number]["groups"][number]["modules"] {
  return modules
    .filter((module) => module.groupId === groupId && module.parentModuleId === parentModuleId)
    .map((module) => ({
      ...module,
      children: moduleTree(modules, groupId, module.id)
    }));
}

function required(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw AppError.validation(`${fieldName} is required.`);
  }
  return value.trim();
}

function withoutUndefined<T extends object>(
  input: T
): { [Key in keyof T]?: Exclude<T[Key], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as {
    [Key in keyof T]?: Exclude<T[Key], undefined>;
  };
}

function newUuid() {
  return randomBytes(4).toString("hex");
}

function now() {
  return new Date().toISOString();
}

type OptionalPlatformInput = {
  [Key in keyof PlatformRegistryPlatform]?: PlatformRegistryPlatform[Key] | undefined;
};
type OptionalGroupInput = {
  [Key in keyof PlatformRegistryGroup]?: PlatformRegistryGroup[Key] | undefined;
};
type OptionalModuleInput = {
  [Key in keyof PlatformRegistryModule]?: PlatformRegistryModule[Key] | undefined;
};
