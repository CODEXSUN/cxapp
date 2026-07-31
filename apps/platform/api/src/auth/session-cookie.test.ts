import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyReply } from "fastify";
import {
  clearAllSessionCookies,
  decryptSessionCookie,
  encryptSessionCookie
} from "./session-cookie.js";

test("fresh login cleanup expires every current and legacy session cookie", () => {
  const cleared: string[] = [];
  const reply = {
    clearCookie(name: string) {
      cleared.push(name);
      return this;
    }
  } as unknown as FastifyReply;

  clearAllSessionCookies(reply);

  assert.deepEqual(cleared, [
    "cxapp_session",
    "cxapp_session_admin",
    "cxapp_session_sa",
    "cxapp_session_tenant",
    "__Host-cxapp_session"
  ]);
});

test("each fresh login cookie is unique and preserves only its new session token", () => {
  const first = encryptSessionCookie("first-session-token");
  const fresh = encryptSessionCookie("fresh-session-token");

  assert.notEqual(fresh, first);
  assert.equal(decryptSessionCookie(first), "first-session-token");
  assert.equal(decryptSessionCookie(fresh), "fresh-session-token");
});
