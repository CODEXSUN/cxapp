export const addonHostApiVersion = "1.0.0" as const;

export type AddonRuntimeMode = "multi-tenant" | "single-client";

export type AddonManifest = {
  capabilities: {
    optional?: readonly string[];
    provided?: readonly string[];
    required: readonly string[];
  };
  compatibleHosts: "host-adapter";
  databaseModes: readonly string[];
  displayName: string;
  hostApi: string;
  key: string;
  kind: "composable-addon-application";
  packages: {
    api: string;
    contracts: string;
    web: string;
  };
  runtimeModes: readonly AddonRuntimeMode[];
  schemaVersion: 1;
  version: string;
};

export function assertAddonManifest(value: unknown): asserts value is AddonManifest {
  if (!isRecord(value)) throw new Error("Add-on manifest must be an object.");
  if (value.schemaVersion !== 1) throw new Error("Unsupported add-on manifest schema.");
  if (value.kind !== "composable-addon-application") {
    throw new Error("Unsupported add-on kind.");
  }
  if (value.compatibleHosts !== "host-adapter") {
    throw new Error("Add-on must use the host-adapter compatibility model.");
  }
  for (const field of ["key", "displayName", "version", "hostApi"] as const) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new Error(`Add-on manifest ${field} is required.`);
    }
  }
  if (!/^[a-z][a-z0-9.-]+$/u.test(value.key as string)) {
    throw new Error(`Add-on key ${String(value.key)} is invalid.`);
  }
  if (!isRecord(value.capabilities) || !isStringArray(value.capabilities.required)) {
    throw new Error("Add-on required capabilities must be declared.");
  }
  for (const field of ["optional", "provided"] as const) {
    const capabilities = value.capabilities[field];
    if (capabilities !== undefined && !isStringArray(capabilities)) {
      throw new Error(`Add-on ${field} capabilities must be an array of names.`);
    }
  }
  if (
    !isStringArray(value.databaseModes) ||
    value.databaseModes.length === 0 ||
    !isRuntimeModeArray(value.runtimeModes) ||
    value.runtimeModes.length === 0
  ) {
    throw new Error("Add-on runtime and database modes must be declared.");
  }
  if (!isRecord(value.packages)) throw new Error("Add-on packages must be declared.");
  for (const field of ["api", "contracts", "web"] as const) {
    if (typeof value.packages[field] !== "string" || !value.packages[field].trim()) {
      throw new Error(`Add-on package ${field} is required.`);
    }
  }
}

export function hostApiMajor(version: string) {
  const match = version.match(/(?:\^|~|>=)?(\d+)\./u);
  if (!match?.[1]) throw new Error(`Invalid host API version ${version}.`);
  return Number(match[1]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim());
}

function isRuntimeModeArray(value: unknown): value is AddonRuntimeMode[] {
  return (
    isStringArray(value) &&
    value.every((item) => item === "multi-tenant" || item === "single-client")
  );
}
