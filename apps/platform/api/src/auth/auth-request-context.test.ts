import assert from "node:assert/strict";
import test from "node:test";
import {
  isTrustedInternalBearerRequest,
  selectRequestAuthentication
} from "./auth-request-context.js";

test("a browser cookie takes precedence over a stale legacy bearer token", () => {
  assert.deepEqual(selectRequestAuthentication("stale-bearer", "active-cookie"), {
    source: "cookie",
    token: "active-cookie"
  });
  assert.deepEqual(selectRequestAuthentication("api-bearer", ""), {
    source: "bearer",
    token: "api-bearer"
  });
  assert.equal(selectRequestAuthentication("", ""), null);
});

test("accepts a bearer token forwarded over the loopback platform API connection", () => {
  assert.equal(isTrustedInternalBearerRequest("bearer", "127.0.0.1", "127.0.0.1"), true);
  assert.equal(isTrustedInternalBearerRequest("bearer", "localhost", "::1"), true);
});

test("does not trust cookies, public hosts, or non-loopback peers as internal forwarding", () => {
  assert.equal(isTrustedInternalBearerRequest("cookie", "127.0.0.1", "127.0.0.1"), false);
  assert.equal(isTrustedInternalBearerRequest("bearer", "app.codexsun.com", "127.0.0.1"), false);
  assert.equal(isTrustedInternalBearerRequest("bearer", "127.0.0.1", "192.0.2.10"), false);
});
