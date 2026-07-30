import { seedCompanyModule } from "./company/index.js";
import { seedDefaultCompanyModule } from "./default-company/index.js";
import { seedFinancialYearModule } from "./financial-year/index.js";
export async function seedOrganisationModule() {
  await seedCompanyModule();
  await seedFinancialYearModule();
  await seedDefaultCompanyModule();
}
