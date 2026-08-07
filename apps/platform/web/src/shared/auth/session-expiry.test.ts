import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSessionExpiredReason,
  hasSessionRefreshedReason,
  installSessionExpiryInterceptor,
  isExpiredSessionResponse,
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
  assert.equal(hasSessionRefreshedReason("?reason=session-refreshed"), true);
  assert.equal(hasSessionRefreshedReason("?reason=session-expired"), false);
});

test("only an explicit expired-session 401 clears session state and opens login", async () => {
  let cleared = 0;
  let replacedWith = "";
  const fetch = async () =>
    Response.json(
      { error: { code: "AUTH_SESSION_EXPIRED", message: "Session expired." }, success: false },
      { status: 401 }
    );
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

test("a domain lookup 401 is not misclassified as an expired browser session", async () => {
  const response = Response.json(
    { error: { code: "UNAUTHORIZED", message: "Platform authentication is required." } },
    { status: 401 }
  );

  assert.equal(await isExpiredSessionResponse(response), false);
  assert.equal(await response.json().then((body) => body.error.code), "UNAUTHORIZED");
});
