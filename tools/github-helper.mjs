#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import { platform } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { formatChangelogCommitSubject, readLatestVersionedChangelogEntry } from "./changelog.mjs";
import { bumpNextVersion } from "./version-bump.mjs";

const ROOT = resolve(import.meta.dirname, "..");

function run(cmd, opts = {}) {
  const stdio = opts.silent ? "pipe" : "inherit";
  const result = execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    stdio,
    ...opts
  });

  return result ? result.trim() : "";
}

function runGit(args, opts = {}) {
  const stdio = opts.silent ? "pipe" : "inherit";
  const result = execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio,
    ...opts
  });

  return result ? result.trim() : "";
}

function runGitQuiet(args) {
  try {
    return runGit(args, { silent: true });
  } catch {
    return "";
  }
}

async function withPrompt(callback) {
  if (!process.stdin.isTTY && platform() === "win32") {
    return callback(askWindowsModal);
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      "Interactive terminal input is required for github:now. Run it from a terminal that accepts input."
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await callback((query, defaultValue = "") => {
      return new Promise((resolveAnswer) => {
        rl.question(query, (answer) => resolveAnswer(answer || defaultValue));
      });
    });
  } finally {
    rl.close();
  }
}

function askWindowsModal(query, defaultValue = "") {
  const isConfirmation = /\[y\/N\]:\s*$/i.test(query);

  if (isConfirmation) {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      `$result = [System.Windows.Forms.MessageBox]::Show(${quotePowerShellString(
        query.replace(/\s*\[y\/N\]:\s*$/i, "")
      )}, 'GitHub Commit Review', 'YesNo', 'Question')`,
      "if ($result -eq 'Yes') { 'yes' } else { 'no' }"
    ].join("; ");

    return runPowerShellModal(script);
  }

  const script = [
    "Add-Type -AssemblyName Microsoft.VisualBasic",
    `[Microsoft.VisualBasic.Interaction]::InputBox(${quotePowerShellString(
      query
    )}, 'GitHub Commit Review', ${quotePowerShellString(defaultValue)})`
  ].join("; ");

  return runPowerShellModal(script);
}

function runPowerShellModal(script) {
  return execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    encoding: "utf8",
    windowsHide: false
  }).trim();
}

function quotePowerShellString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderReviewBox({ fileCount, subject, version }) {
  const rows = [
    "GitHub Commit Review",
    `Version: ${version}`,
    `Subject: ${subject}`,
    `Files: ${fileCount}`
  ];
  const width = Math.max(...rows.map((row) => row.length)) + 4;
  const border = `+${"-".repeat(width)}+`;
  const lines = rows.map((row) => `| ${row.padEnd(width - 2)} |`);

  return ["", border, ...lines, border, ""].join("\n");
}

function isYes(value) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let changelogEntry = readLatestVersionedChangelogEntry(ROOT);
  let defaultMessage = formatChangelogCommitSubject(changelogEntry);
  const status = run("git status --porcelain", { silent: true });
  const files = status ? status.split("\n").filter(Boolean) : [];

  console.log(`\n  Changelog version: ${changelogEntry.version}`);
  console.log(`  Commit subject:    ${defaultMessage}`);
  console.log(`  Uncommitted:       ${files.length} files\n`);

  if (files.length > 0) {
    files.forEach((file) => console.log(`    ${file}`));
    console.log("");
  }

  if (dryRun) {
    console.log(
      renderReviewBox({
        fileCount: files.length,
        subject: defaultMessage,
        version: changelogEntry.version
      })
    );
    console.log("  Dry run only. No pull, commit, or push was performed.\n");
    return;
  }

  const message = await withPrompt(async (ask) => {
    console.log(
      renderReviewBox({
        fileCount: files.length,
        subject: defaultMessage,
        version: changelogEntry.version
      })
    );

    const shouldBump = await ask("  Bump next version before commit? [y/N]: ");

    if (isYes(shouldBump)) {
      const titleAnswer = await ask("  Version title [version update]: ", "version update");
      const title = titleAnswer.trim() || "version update";
      const bump = bumpNextVersion(ROOT, title);

      changelogEntry = readLatestVersionedChangelogEntry(ROOT);
      defaultMessage = formatChangelogCommitSubject(changelogEntry);

      console.log(`\n  Bumped ${bump.currentVersion} -> ${bump.nextVersion}`);
      console.log(`  Commit subject: ${defaultMessage}\n`);
    }

    const answer = await ask(`  Commit message [${defaultMessage}]: `, defaultMessage);
    const subject = answer.trim() || defaultMessage;
    const confirm = await ask("  Continue with pull, commit, and push? [y/N]: ");

    if (!isYes(confirm)) {
      throw new Error("Cancelled.");
    }

    return subject;
  });

  checkAndPull();

  console.log("  > git add -A");
  runGit(["add", "-A"]);

  console.log(`  > git commit -m "${message}"`);
  runGit(["commit", "-m", message]);

  console.log("  > git push");
  runGit(["push"]);

  console.log(`\n  Done - ${message}\n`);
}

function checkAndPull() {
  const upstream = runGitQuiet([
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}"
  ]);
  if (!upstream) {
    console.log("\n  No upstream branch found. Skipping pull.\n");
    return;
  }

  console.log("\n  > git fetch");
  runGit(["-c", "maintenance.auto=false", "-c", "gc.auto=0", "fetch", "--quiet"]);

  const behind = Number(runGitQuiet(["rev-list", "--count", `HEAD..${upstream}`]) || 0);
  if (!behind) {
    console.log("  Already up to date.\n");
    return;
  }

  console.log(`  Branch is behind ${upstream} by ${behind} commit(s).`);
  console.log("  > git pull --rebase --autostash");
  runGit(["-c", "maintenance.auto=false", "-c", "gc.auto=0", "pull", "--rebase", "--autostash"]);
  console.log("");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`\n  Error: ${error.message}\n`);
    process.exit(1);
  });
}
