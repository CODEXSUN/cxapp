import assert from "node:assert/strict";
import test from "node:test";
import { getCompanyId, getFinancialYearId } from "./tenant-context";

function storage(values: Record<string, string>): Storage {
  return {
    clear() {},
    getItem(key) {
      return values[key] ?? null;
    },
    key(index) {
      return Object.keys(values)[index] ?? null;
    },
    get length() {
      return Object.keys(values).length;
    },
    removeItem(key) {
      delete values[key];
    },
    setItem(key, value) {
      values[key] = value;
    }
  };
}

test("accounts reads the company and financial year published by the application desk", () => {
  Object.assign(globalThis, {
    localStorage: storage({
      "cxapp.tenant.company-id": "17",
      "cxapp.tenant.financial-year-id": "23"
    }),
    sessionStorage: storage({})
  });

  assert.equal(getCompanyId(), 17);
  assert.equal(getFinancialYearId(), 23);
});

test("accounts rejects missing and invalid company scope values", () => {
  Object.assign(globalThis, {
    localStorage: storage({
      "cxapp.tenant.company-id": "0",
      "cxapp.tenant.financial-year-id": "not-a-number"
    })
  });

  assert.equal(getCompanyId(), null);
  assert.equal(getFinancialYearId(), null);
});

test("accounts mutations send the published company and financial year headers", async () => {
  Object.assign(globalThis, {
    localStorage: storage({
      "cxapp.tenant.company-id": "17",
      "cxapp.tenant.financial-year-id": "23"
    }),
    sessionStorage: storage({
      cxapp_tenant_db_name: "cxapp_tenant_test",
      cxapp_tenant_id: "tenant-test"
    }),
    window: { __CXAPP_RUNTIME_CONFIG__: { VITE_PLATFORM_API_URL: "http://127.0.0.1:7010" } }
  });

  let requestHeaders = new Headers();
  globalThis.fetch = async (_input, init) => {
    requestHeaders = new Headers(init?.headers);
    return new Response(
      JSON.stringify({
        data: { id: 1 },
        meta: { requestId: "test", timestamp: "now" },
        success: true
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  };

  const { accountsApiPost } = await import("./accounts-api");
  await accountsApiPost("/cash-book/ledgers", { groupId: 1, name: "Test ledger" });

  assert.equal(requestHeaders.get("x-company-id"), "17");
  assert.equal(requestHeaders.get("x-financial-year-id"), "23");
  assert.equal(requestHeaders.get("x-tenant-id"), "tenant-test");
  assert.equal(requestHeaders.get("x-tenant-db"), "cxapp_tenant_test");
});
