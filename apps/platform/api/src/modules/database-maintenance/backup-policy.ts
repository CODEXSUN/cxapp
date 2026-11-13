import { createHash } from "node:crypto";
export function checksum(sql: string) {
  return createHash("sha256").update(sql).digest("hex");
}
export function sandboxName(name: string) {
  if (!/^cxrestore_[a-zA-Z0-9_]{1,50}$/.test(name))
    throw new Error("Use a new database name beginning cxrestore_ (maximum 60 characters).");
  return name;
}
// Split SQL without treating punctuation inside quoted values or comments as commands.
export function statements(sql: string) {
  const out: string[] = [];
  let current = "";
  let quote = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    const next = sql[i + 1];
    if (quote) {
      current += c;
      if (c === "\\") {
        if (next) {
          current += next;
          i++;
        }
      } else if (c === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else quote = "";
      }
    } else if (c === "'" || c === '"' || c === "`") {
      quote = c;
      current += c;
    } else if ((c === "-" && next === "-" && /\s/.test(sql[i + 2] || " ")) || c === "#") {
      while (i < sql.length && sql[i] !== "\n") i++;
      current += "\n";
    } else if (c === "/" && next === "*") {
      throw new Error("Executable and block SQL comments are not supported by this backup format.");
    } else if (c === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else current += c;
  }
  if (quote) throw new Error("Unterminated SQL value.");
  if (current.trim()) out.push(current.trim());
  return out;
}
export function restoreStatements(sql: string) {
  const commands = statements(sql);
  const result: string[] = [];
  for (const s of commands) {
    if (
      /^(CREATE DATABASE IF NOT EXISTS \u0060[a-zA-Z0-9_]+\u0060 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci|USE \u0060[a-zA-Z0-9_]+\u0060)$/i.test(
        s
      )
    )
      continue;
    if (/^SET FOREIGN_KEY_CHECKS=[01]$/i.test(s)) {
      result.push(s);
      continue;
    }
    if (/^DROP TABLE IF EXISTS \u0060[a-zA-Z0-9_]+\u0060$/i.test(s)) {
      result.push(s);
      continue;
    }
    const outside = s.replace(/'(?:\\.|''|[^'\\])*'/gs, "''");
    if (
      /^CREATE TABLE \u0060[a-zA-Z0-9_]+\u0060\s*\(/i.test(s) &&
      /\) ENGINE=InnoDB\b/i.test(outside) &&
      !/\u0060\s*\.|\.\s*\u0060|[a-z_]\s*\.\s*[a-z_]|\b(SELECT|OUTFILE|INFILE|DIRECTORY|UNION|CONNECTION|TRIGGER|PROCEDURE|FUNCTION|GLOBAL|GRANT|REVOKE)\b/i.test(
        outside
      )
    ) {
      result.push(s);
      continue;
    }
    const insert = s.match(
      /^INSERT INTO \u0060[a-zA-Z0-9_]+\u0060 \((?:\u0060[a-zA-Z0-9_]+\u0060(?:, )?)+\) VALUES \((.*)\)$/s
    );
    if (
      insert &&
      /^(?:NULL|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|X'[a-f0-9]*'|'(?:\\.|''|[^'\\])*')(?:, (?:NULL|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|X'[a-f0-9]*'|'(?:\\.|''|[^'\\])*'))*$/i.test(
        insert[1]!
      )
    ) {
      result.push(s);
      continue;
    }
    throw new Error(
      "Unsupported SQL in backup. Restore accepts only CXApp InnoDB tables and literal row values."
    );
  }
  if (!result.some((s) => s.startsWith("CREATE TABLE ")))
    throw new Error("Backup contains no supported tables.");
  return result;
}
