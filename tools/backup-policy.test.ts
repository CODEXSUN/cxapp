import assert from "node:assert/strict";
import test from "node:test";
import {
  statements,
  restoreStatements,
  sandboxName,
  checksum
} from "../apps/platform/api/src/modules/database-maintenance/backup-policy.js";
const ddl =
  "CREATE TABLE `sample` (`id` bigint NOT NULL, `value` text) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
test("SQL header does not swallow the first DROP and quoted delimiters survive", () => {
  const sql =
    "-- header\nDROP TABLE IF EXISTS `sample`;" +
    ddl +
    ";INSERT INTO `sample` (`id`, `value`) VALUES (1, 'a; b -- c''d');";
  assert.equal(statements(sql).length, 3);
  assert.match(restoreStatements(sql)[0]!, /^DROP TABLE/);
});
test("export database directives are removed before sandbox restore", () => {
  const sql =
    "CREATE DATABASE IF NOT EXISTS `source` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE `source`; SET FOREIGN_KEY_CHECKS=0;" +
    ddl +
    "; SET FOREIGN_KEY_CHECKS=1;";
  const commands = restoreStatements(sql);
  assert.equal(commands.length, 3);
  assert.ok(commands.every((c) => !c.startsWith("USE ")));
});
test("rejects cross-database SQL, commands and expression-based inserts", () => {
  for (const sql of [
    "DROP DATABASE `prod`;",
    "CREATE TABLE `sample` (`id` int) ENGINE=FEDERATED CONNECTION='mysql://remote';",
    "INSERT INTO `sample` (`id`) VALUES ((SELECT 1));",
    "INSERT INTO `sample` (`id`) VALUES (sleep(10));",
    "INSERT INTO `other`.`sample` (`id`) VALUES (1);",
    "/*!50000 DROP DATABASE prod */;",
    "CREATE TABLE `sample` (`id` int REFERENCES prod.users(id)) ENGINE=InnoDB;"
  ]) {
    assert.throws(() => restoreStatements(ddl + ";" + sql));
  }
});
test("accepts literal binary, numeric and escaped text values", () => {
  assert.equal(
    restoreStatements(
      ddl + "; INSERT INTO `sample` (`id`, `value`) VALUES (18446744073709551615, X'0061ff');"
    ).length,
    2
  );
  assert.throws(() => statements("INSERT INTO `sample` VALUES ('unterminated);"));
});
test("sandbox names and checksum detect wrong targets and corrupt files", () => {
  assert.equal(sandboxName("cxrestore_master_20261113"), "cxrestore_master_20261113");
  for (const n of [
    "cxapp_master_db",
    "mysql",
    "cxrestore_",
    "cxrestore_a;DROP DATABASE x",
    "cxrestore_" + "a".repeat(51)
  ])
    assert.throws(() => sandboxName(n));
  assert.notEqual(checksum("backup"), checksum("backup!"));
});
