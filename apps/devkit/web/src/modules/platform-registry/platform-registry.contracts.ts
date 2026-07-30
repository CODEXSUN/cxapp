export type PlatformRegistryPlatform = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type PlatformRegistryGroup = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  parentGroupId: string;
  platformId: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type PlatformRegistryModule = {
  active: boolean;
  createdAt: string;
  description: string;
  documentation: Record<string, PlatformRegistryDocumentationRow[]>;
  groupId: string;
  id: string;
  key: string;
  moduleType: "area" | "module" | "page";
  name: string;
  parentModuleId: string;
  planningNotes: PlatformRegistryPlanningNote[];
  routePath: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type PlatformRegistryDocumentationRow = {
  createdAt: string;
  id: string;
  key: string;
  updatedAt: string;
  value: string;
};
export type PlatformRegistryPlanningNote = {
  body: string;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
};

export type PlatformRegistryModuleNode = PlatformRegistryModule & {
  children: PlatformRegistryModuleNode[];
};

export type PlatformRegistryGroupNode = PlatformRegistryGroup & {
  modules: PlatformRegistryModuleNode[];
  subGroups: PlatformRegistryGroupNode[];
};

export type PlatformRegistryPlatformNode = PlatformRegistryPlatform & {
  groups: PlatformRegistryGroupNode[];
};

export type PlatformRegistryResult = {
  generatedAt: string;
  platforms: PlatformRegistryPlatformNode[];
  summary: {
    activeGroups: number;
    activeModules: number;
    platforms: number;
    totalGroups: number;
    totalModules: number;
  };
};
