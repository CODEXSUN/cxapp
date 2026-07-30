import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSessionExpiredReason,
  installSessionExpiryInterceptor,
  protectedDeskFromPathname,
  sessionExpiredLoginPath
} from "./session-expiry";

test("maps protected routes to their owning login desk", () => {
  assert.equal(protectedDeskFromPathname("/app/billing"), "tenant");
  assert.equal(protectedDeskFromPathname("/sa/tenants"), "sa");
  assert.equal(protectedDeskFromPathname("/admin"), "admin");
});

test("does not treat login and public pages as protected routes", () => {
  assert.equal(protectedDeskFromPathname("/login"), null);
  assert.equal(protectedDeskFromPathname("/sa/login"), null);
  assert.equal(protectedDeskFromPathname("/admin/login"), null);
  assert.equal(protectedDeskFromPathname("/features"), null);
});

test("builds desk-aware login routes with a durable expiry reason", () => {
  assert.equal(sessionExpiredLoginPath("tenant"), "/login?reason=session-expired");
  assert.equal(sessionExpiredLoginPath("sa"), "/sa/login?reason=session-expired");
  assert.equal(sessionExpiredLoginPath("admin"), "/admin/login?reason=session-expired");
  assert.equal(hasSessionExpiredReason("?reason=session-expired"), true);
  assert.equal(hasSessionExpiredReason("?reason=invalid-credentials"), false);
});

test("a protected 401 clears session state and replaces the page with login", async () => {
  let cleared = 0;
  let replacedWith = "";
  const fetch = async () => new Response(null, { status: 401 });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      fetch,
      location: {
        pathname: "/app/billing/sales",
        replace: (path: string) => {
          replacedWith = path;
        }
      }
    }
  });

  installSessionExpiryInterceptor(() => {
    cleared += 1;
  });
  await window.fetch("/api/billing/sales");

  assert.equal(cleared, 1);
  assert.equal(replacedWith, "/login?reason=session-expired");
});
