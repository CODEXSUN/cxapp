import { seedCityModule } from "./city/city.seed.js";
import { seedCountryModule } from "./country/country.seed.js";
import { seedDistrictModule } from "./district/district.seed.js";
import { seedPincodeModule } from "./pincode/pincode.seed.js";
import { seedStateModule } from "./state/state.seed.js";

export async function seedLocationModules() {
  await seedCountryModule();
  await seedStateModule();
  await seedDistrictModule();
  await seedCityModule();
  await seedPincodeModule();
}
