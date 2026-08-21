#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageFiles = ["apps/platform/api/package.json", "apps/platform/web/package.json"];
const expected = process.argv[2] ?? process.env.CXAPP_BLOG_VERSION;
if (!expected || !/^\d+\.\d+\.\d+$/u.test(expected)) throw new Error("Usage: node tools/check-blog-package.mjs x.y.z");
const pin = `github:CODEXSUN/blog#v-${expected}`;
for (const file of packageFiles) {
  const pkg = JSON.parse(readFileSync(resolve(root, file), "utf8"));
  if (pkg.dependencies?.["@codexsun/blog"] !== pin) throw new Error(`${file} is not pinned to ${pin}`);
}
const tags = execFileSync("git", ["ls-remote", "--tags", "https://github.com/CODEXSUN/blog.git", `refs/tags/v-${expected}`], { encoding: "utf8" });
if (!tags.trim()) throw new Error(`GitHub tag v-${expected} was not found.`);
console.log(`Blog package verified: @codexsun/blog v-${expected} (${pin})`);
