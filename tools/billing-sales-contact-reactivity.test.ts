import assert from "node:assert/strict";
import test from "node:test";

const storage = { getItem: () => null, removeItem: () => undefined };
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: { __CXAPP_RUNTIME_CONFIG__: { VITE_PLATFORM_API_URL: "http://127.0.0.1:7020/api" } }
});

test("sales resolves refreshed billing and shipping address state names", async () => {
  const { buildSaleAddressChoices, resolveSaleAddressChoices } =
    await import("../apps/billing/web/src/modules/sales/sales-address-editor");
  const choices = buildSaleAddressChoices({
    addresses: [address(11, "Billing", "Tamil Nadu"), address(12, "Shipping", "Kerala")],
    id: "7"
  });

  const selected = resolveSaleAddressChoices(choices, 11, 12);

  assert.match(selected.billing?.description ?? "", /Tamil Nadu/);
  assert.match(selected.shipping?.description ?? "", /Kerala/);
});

test("sales falls back to the contact's current address IDs after an address alteration", async () => {
  const { buildSaleAddressChoices, resolveSaleAddressChoices } =
    await import("../apps/billing/web/src/modules/sales/sales-address-editor");
  const choices = buildSaleAddressChoices({
    addresses: [address(21, "Billing", "Karnataka"), address(22, "Shipping", "Telangana")],
    id: "7"
  });

  const selected = resolveSaleAddressChoices(choices, 11, 12);

  assert.equal(selected.billing?.addressId, 21);
  assert.equal(selected.shipping?.addressId, 22);
});

test("sales quick contact edits retain the separate shipping address", async () => {
  let requestBody: unknown;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        data: { id: "7" },
        meta: { requestId: "test", timestamp: "now" },
        success: true
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  };
  const { updateSaleContact } =
    await import("../apps/billing/web/src/modules/sales/sales.services");
  await updateSaleContact(
    "7",
    {
      addressLine1: "Updated billing address",
      addressLine2: "",
      addressTypeId: "1",
      addressTypeName: "Billing",
      cityId: "31",
      cityName: "Tiruppur",
      countryId: "1",
      countryName: "India",
      districtId: "21",
      districtName: "Tiruppur",
      gstin: "",
      legalName: "CUSTOMER",
      name: "Customer",
      pincodeId: "41",
      pincodeName: "641601",
      primaryEmail: "",
      primaryPhone: "",
      stateId: "11",
      stateName: "Tamil Nadu",
      typeId: "1",
      typeName: "Customer"
    },
    {
      addresses: [address(101, "Billing", "Old state"), address(102, "Shipping", "Kerala")],
      id: "7"
    }
  );

  const payload = requestBody as { addresses: Array<{ id?: number; stateName?: string }> };
  assert.equal(payload.addresses.length, 2);
  assert.deepEqual(
    payload.addresses.map(({ id }) => id),
    [101, 102]
  );
  assert.equal(payload.addresses[0]?.stateName, "Tamil Nadu");
  assert.equal(payload.addresses[1]?.stateName, "Kerala");
});

function address(id: number, addressTypeName: string, stateName: string) {
  return {
    addressLine1: `${addressTypeName} address`,
    addressLine2: null,
    addressTypeId: 1,
    addressTypeName,
    cityId: 31,
    cityName: "City",
    countryId: 1,
    countryName: "India",
    districtId: 21,
    districtName: "District",
    id,
    isDefault: addressTypeName === "Billing",
    pincodeId: 41,
    pincodeName: "641601",
    stateId: 11,
    stateName
  };
}
