import type { FastifyInstance } from "fastify";
import { cityModule } from "./city/city.module.js";
import { countryModule } from "./country/country.module.js";
import { districtModule } from "./district/district.module.js";
import { pincodeModule } from "./pincode/pincode.module.js";
import { stateModule } from "./state/state.module.js";

export const locationModules = [
  countryModule,
  stateModule,
  districtModule,
  cityModule,
  pincodeModule
] as const;

export const locationModule = {
  key: "core.common.location",
  label: "Common Location",
  async register(app: FastifyInstance) {
    for (const module of locationModules) {
      await module.register(app);
    }
  }
};
