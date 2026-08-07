import assert from "node:assert/strict";
import test from "node:test";
import { bumpPatch } from "./version-bump.mjs";

test("bumps only a complete three-part numeric version", () => {
  assert.equal(bumpPatch("1.0.55"), "1.0.56");
  assert.throws(() => bumpPatch("1.0.55beta"), /Unsupported version format/u);
  assert.throws(() => bumpPatch("1.0"), /Unsupported version format/u);
  assert.throws(() => bumpPatch("1.0.5.5"), /Unsupported version format/u);
});
