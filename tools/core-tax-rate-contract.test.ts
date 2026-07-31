import assert from "node:assert/strict";
import test from "node:test";
import { TaxesService } from "../apps/core/api/src/modules/common/products/taxes/taxes.service";
import type {
  TaxesRecord,
  TaxesSavePayload
} from "../apps/core/api/src/modules/common/products/taxes/taxes.types";

test("Core tax owner persists the numeric rate as the canonical description", async () => {
  let saved: TaxesSavePayload | undefined;
  const record: TaxesRecord = {
    id: 71,
    ratePercent: 34,
    description: "34",
    isActive: true,
    sortOrder: 1000
  };
  const repository = {
    create: async (input: TaxesSavePayload) => {
      saved = input;
      return record;
    }
  };
  const service = new TaxesService(repository as never);

  await service.create({
    ratePercent: 34,
    description: "GST 34%",
    isActive: true,
    sortOrder: 1000
  });

  assert.deepEqual(saved, {
    ratePercent: 34,
    description: "34",
    isActive: true,
    sortOrder: 1000
  });
});

test("Core tax owner rejects negative user-created rates", () => {
  const service = new TaxesService({} as never);
  assert.throws(
    () =>
      service.create({
        ratePercent: -1,
        description: "-",
        isActive: true,
        sortOrder: 1000
      }),
    /Rate percent is required/
  );
});
