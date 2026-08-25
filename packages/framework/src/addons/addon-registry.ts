import {
  addonHostApiVersion,
  assertAddonManifest,
  hostApiMajor,
  type AddonManifest,
  type AddonRuntimeMode,
} from "./addon-contract.js";

export type AddonRegistration = {
  activate: () => Promise<void>;
  close?: () => Promise<void>;
  databaseMode: string;
  manifest: AddonManifest;
  moduleKeys: readonly string[];
};

export type ActiveAddon = {
  databaseMode: string;
  manifest: AddonManifest;
  moduleKeys: readonly string[];
};

export class AddonHostRegistry {
  private readonly active = new Map<string, ActiveAddon>();
  private readonly closers: Array<() => Promise<void>> = [];

  constructor(
    private readonly options: {
      capabilities: readonly string[];
      runtimeMode: AddonRuntimeMode;
    },
  ) {}

  async register(registration: AddonRegistration) {
    assertAddonManifest(registration.manifest);
    this.assertCompatible(registration);
    assertModuleKeys(registration.moduleKeys);
    if (this.active.has(registration.manifest.key)) {
      throw new Error(`Add-on already registered: ${registration.manifest.key}`);
    }
    try {
      await registration.activate();
    } catch (activationError) {
      if (!registration.close) throw activationError;
      try {
        await registration.close();
      } catch (closeError) {
        throw new AggregateError(
          [activationError, closeError],
          `Add-on activation and cleanup failed: ${registration.manifest.key}`,
        );
      }
      throw activationError;
    }
    this.active.set(registration.manifest.key, {
      databaseMode: registration.databaseMode,
      manifest: registration.manifest,
      moduleKeys: [...registration.moduleKeys],
    });
    if (registration.close) this.closers.unshift(registration.close);
  }

  list() {
    return [...this.active.values()];
  }

  moduleKeys() {
    return this.list().flatMap((addon) => addon.moduleKeys);
  }

  async close() {
    const errors: unknown[] = [];
    try {
      for (const close of this.closers) {
        try {
          await close();
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      this.closers.length = 0;
      this.active.clear();
    }
    if (errors.length > 0) throw new AggregateError(errors, "One or more add-ons failed to close.");
  }

  private assertCompatible(registration: AddonRegistration) {
    const manifest = registration.manifest;
    if (hostApiMajor(manifest.hostApi) !== hostApiMajor(addonHostApiVersion)) {
      throw new Error(
        `${manifest.displayName} requires host API ${manifest.hostApi}; this host provides ${addonHostApiVersion}.`,
      );
    }
    if (!manifest.runtimeModes.includes(this.options.runtimeMode)) {
      throw new Error(`${manifest.displayName} does not support ${this.options.runtimeMode}.`);
    }
    if (!manifest.databaseModes.includes(registration.databaseMode)) {
      throw new Error(
        `${manifest.displayName} does not support database mode ${registration.databaseMode}.`,
      );
    }
    const available = new Set(this.options.capabilities);
    const missing = manifest.capabilities.required.filter((item) => !available.has(item));
    if (missing.length) {
      throw new Error(`${manifest.displayName} requires unavailable capabilities: ${missing.join(", ")}.`);
    }
  }
}

function assertModuleKeys(moduleKeys: readonly string[]) {
  if (moduleKeys.some((key) => !key.trim())) throw new Error("Add-on module keys cannot be empty.");
  if (new Set(moduleKeys).size !== moduleKeys.length) {
    throw new Error("Add-on module keys must be unique within a registration.");
  }
}
