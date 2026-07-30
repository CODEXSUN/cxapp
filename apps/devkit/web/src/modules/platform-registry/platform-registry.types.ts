import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform
} from "./platform-registry.contracts";

export type PlatformRegistryKind = "group" | "module" | "platform";

export type PlatformRegistryFormPayload = {
  active?: boolean | undefined;
  description?: string | undefined;
  key: string;
  name: string;
  parentId?: string | undefined;
  status?: string | undefined;
};

export type PlatformRegistryRow =
  | (PlatformRegistryPlatform & { kind: "platform"; parentName?: string })
  | (PlatformRegistryGroup & { kind: "group"; parentName?: string })
  | (PlatformRegistryModule & { kind: "module"; parentName?: string });
