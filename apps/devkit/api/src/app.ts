import "@cxapp/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { bootstrapDevkitDatabase, runWithDevkitDatabase } from "./database/index.js";
import type { DevkitDatabase } from "./database/index.js";
import { platformRegistryModule } from "./modules/platform-registry/index.js";
import { runWithDevkitActor, type DevkitActor } from "./request-context.js";

export const devkitApiModuleKeys = [platformRegistryModule.key] as const;

export type DevkitHostRequestContext = {
  actor: DevkitActor;
  database: Kysely<DevkitDatabase>;
};

export type DevkitHostAdapter = {
  authorize?(input: {
    context: DevkitHostRequestContext;
    request: FastifyRequest;
  }): Promise<void> | void;
  resolve(request: FastifyRequest): Promise<DevkitHostRequestContext> | DevkitHostRequestContext;
};

export async function registerDevkitApiForHost(app: FastifyInstance, adapter: DevkitHostAdapter) {
  await app.register(
    async (devkitApp) => {
      const contexts = new WeakMap<FastifyRequest, DevkitHostRequestContext>();
      devkitApp.addHook("onRequest", (request, _reply, done) => {
        void Promise.resolve(adapter.resolve(request))
          .then((context) => {
            contexts.set(request, context);
            runWithDevkitDatabase(context.database, () => runWithDevkitActor(context.actor, done));
          })
          .catch((error: unknown) => done(error as Error));
      });
      devkitApp.addHook("preHandler", async (request) => {
        const context = contexts.get(request);
        if (!context) throw new Error("DevKit host request context is unavailable.");
        await bootstrapDevkitDatabase(context.database);
        await adapter.authorize?.({ context, request });
      });
      await platformRegistryModule.register({ app: devkitApp });
    },
    { prefix: "/devkit" }
  );
}
