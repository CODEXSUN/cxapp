import { seedContactModule } from "./contact/index.js";
import { seedProductModule } from "./product/index.js";
import { seedWorkOrderModule } from "./work-order/index.js";
export async function seedMasterModule() {
  await seedContactModule();
  await seedProductModule();
  await seedWorkOrderModule();
}
