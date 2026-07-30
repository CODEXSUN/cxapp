import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CHANGELOG_PATH = join("assist", "documentation", "CHANGELOG.md");

export function parseLatestVersionedChangelogEntry(changelogContent) {
  const match = changelogContent.match(
    /^### \[v\s+(\d+)\.(\d+)\.(\d+)\]\s+\d{4}-\d{2}-\d{2}(?:\s+(?:[1-9]|1[0-2]):[0-5]\d\s+(?:am|pm))?\s+-\s+(.+)$/m
  );

  if (!match) {
    throw new Error(`Could not read latest versioned changelog entry from ${CHANGELOG_PATH}.`);
  }

  const reference = Number.parseInt(match[3] ?? "", 10);
  const title = match[4]?.trim();

  if (!Number.isInteger(reference) || reference < 0 || !title) {
    throw new Error("Latest changelog reference or title is invalid.");
  }

  return {
    reference,
    title,
    version: `${match[1]}.${match[2]}.${match[3]}`
  };
}

export function readLatestVersionedChangelogEntry(rootDir) {
  const changelogPath = join(rootDir, CHANGELOG_PATH);
  return parseLatestVersionedChangelogEntry(readFileSync(changelogPath, "utf8"));
}

export function formatChangelogCommitSubject(entry) {
  return `#${entry.reference} - ${entry.title}`;
}
