import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { bumpNextVersion } from "../version-bump.mjs";

const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const changelogPath = path.join(root, "assist", "documentation", "CHANGELOG.md");
const [, , command, ...args] = process.argv;

if (!command || command === "show") {
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  console.log(`CODEXSUN version ${pkg.version}`);
  process.exit(0);
}

if (command === "append") {
  await appendChangelogEntry({
    databaseUpdate: readArg("--database-update") ?? "No",
    note: readArg("--note") ?? "Updated foundation work.",
    title: readArg("--title") ?? "Foundation progress"
  });
  process.exit(0);
}

if (command === "bump") {
  const explicitVersion = readArg("--version");
  const title = readArg("--title") ?? "Version update";
  const databaseUpdate = readArg("--database-update") ?? "No";
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  if (!explicitVersion) {
    const result = bumpNextVersion(root, title, {
      databaseUpdate: databaseUpdate.toLowerCase() === "yes"
    });
    console.log(`Version set to ${result.nextVersion}`);
    process.exit(0);
  }

  const nextVersion = explicitVersion;
  pkg.version = nextVersion;
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  await setVersionState(nextVersion);
  await appendChangelogEntry({
    databaseUpdate,
    note: `Bumped workspace version to ${nextVersion}.`,
    title
  });
  console.log(`Version set to ${nextVersion}`);
  process.exit(0);
}

console.error(`Unknown version command: ${command}`);
process.exit(1);

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function setVersionState(version) {
  const changelog = await readFile(changelogPath, "utf8");
  const updated = changelog
    .replace(/Current version: .*/u, `Current version: ${version}`)
    .replace(/Release tag: .*/u, `Release tag: v-${version}`)
    .replace(/Changelog label: .*/u, `Changelog label: v ${version}`);

  await writeFile(changelogPath, updated);
}

async function appendChangelogEntry({ databaseUpdate, note, title }) {
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const version = pkg.version;
  const changelog = await readFile(changelogPath, "utf8");
  const sectionHeader = `## v-${version}`;
  const timestamp = new Date()
    .toLocaleString("en-IN", {
      day: "2-digit",
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Kolkata",
      year: "numeric"
    })
    .replace(",", "")
    .replace("AM", "am")
    .replace("PM", "pm");
  const entry = [
    `### [v ${version}] ${timestamp} - ${title}`,
    "",
    "#### Database Changes",
    "",
    `- Database update: ${databaseUpdate}.`,
    "",
    "#### App Codebase Changes",
    "",
    `- ${note}`,
    ""
  ].join("\n");

  if (changelog.includes(sectionHeader)) {
    await writeFile(
      changelogPath,
      changelog.replace(sectionHeader, `${sectionHeader}\n\n${entry}`)
    );
    console.log(`Appended changelog entry under ${sectionHeader}`);
    return;
  }

  const markerIndex = changelog.indexOf("## v-");
  const insertAt = markerIndex === -1 ? changelog.length : markerIndex;
  const updated = `${changelog.slice(0, insertAt)}${sectionHeader}\n\n${entry}\n${changelog.slice(insertAt)}`;
  await writeFile(changelogPath, updated);
  console.log(`Created ${sectionHeader} and appended entry`);
}
