#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workspaceRoots = ["apps", "packages", "tools"].map((directory) => join(root, directory));
const nestedDependencyTrees = [];

function findNestedDependencyTrees(directory) {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = join(directory, entry.name);

    if (entry.name === "node_modules") {
      nestedDependencyTrees.push(relative(root, fullPath));
      continue;
    }

    findNestedDependencyTrees(fullPath);
  }
}

for (const workspaceRoot of workspaceRoots) {
  findNestedDependencyTrees(workspaceRoot);
}

if (nestedDependencyTrees.length > 0) {
  console.error("Workspace-local node_modules folders are not allowed:");
  for (const directory of nestedDependencyTrees) {
    console.error(`- ${directory}`);
  }
  console.error("Run npm run dependencies:clean from the repository root.");
  process.exit(1);
}

console.log("Dependency layout verified: workspace packages use the root node_modules");
