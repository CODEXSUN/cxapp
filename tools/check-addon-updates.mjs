#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dependencies = JSON.parse(
  readFileSync(resolve(root, "apps/platform/api/package.json"), "utf8")
).dependencies;
const addons = ["@codexsun/blog", "@codexsun/file-manager"];
const updates = [];

for (const name of addons) {
  const current = dependencies[name];
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error(`npm registry lookup failed for ${name} (${response.status}).`);
  const latest = (await response.json()).version;
  if (typeof latest !== "string") throw new Error(`npm registry returned no version for ${name}.`);
  if (current !== latest) updates.push({ current, latest, name });
}

if (updates.length > 0) {
  for (const update of updates) {
    console.error(`${update.name} can update from ${update.current} to ${update.latest}.`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Add-on npm releases are current: ${addons.map((name) => `${name}@${dependencies[name]}`).join(", ")}`
  );
}
