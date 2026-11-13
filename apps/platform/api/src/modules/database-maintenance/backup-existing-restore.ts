import type { Connection, RowDataPacket } from "mysql2/promise";
const quote = (name: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error("Unsupported table or column identifier.");
  return String.fromCharCode(96) + name + String.fromCharCode(96);
};
const normalize = (ddl: string) =>
  ddl
    .replace(/AUTO_INCREMENT=\d+\s*/gi, "")
    .replace(/\r/g, "")
    .trim();
export async function restoreExisting(input: {
  connection: Connection;
  commands: string[];
  databaseName: string;
  mode: "fresh" | "incremental";
  safetyBackup: () => Promise<string>;
}) {
  const { connection, commands, databaseName, mode } = input;
  await connection.changeUser({ database: databaseName }); // Must exist, never silently create a fresh target.
  const [objects] = await connection.query<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA=?) + (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?) + (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?) + (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=?) AS total",
    [databaseName, databaseName, databaseName, databaseName]
  );
  if (Number(objects[0]?.total))
    throw new Error(
      "Existing restore requires a table-only database. Native MariaDB tooling is required for views, triggers, routines or events."
    );
  const [tables] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'",
    [databaseName]
  );
  if (tables.some((t) => t.ENGINE !== "InnoDB"))
    throw new Error("Existing restore requires InnoDB tables.");
  const creates = commands.filter((s) => s.startsWith("CREATE TABLE "));
  const primaryKeys = new Map<string, string[]>();
  if (mode === "incremental")
    for (const ddl of creates) {
      const table = ddl.match(/^CREATE TABLE \u0060([a-zA-Z0-9_]+)\u0060/)![1]!;
      if (!tables.some((t) => t.TABLE_NAME === table))
        throw new Error(
          "Incremental restore requires matching existing tables. Missing table: " + table
        );
      const [definition] = await connection.query<RowDataPacket[]>(
        "SHOW CREATE TABLE " + quote(table)
      );
      if (normalize(String(definition[0]?.["Create Table"])) !== normalize(ddl))
        throw new Error("Schema mismatch for " + table + ". Use fresh restore for schema changes.");
      const [keys] = await connection.query<RowDataPacket[]>(
        "SHOW INDEX FROM " + quote(table) + " WHERE Key_name='PRIMARY'"
      );
      const columns = keys
        .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
        .map((k) => String(k.Column_name));
      if (!columns.length)
        throw new Error("Incremental restore requires a primary key on " + table);
      primaryKeys.set(table, columns);
    }
  const ordered: string[] = [];
  const dependencies = new Map(
    creates.map((ddl) => [
      ddl.match(/^CREATE TABLE \u0060([a-zA-Z0-9_]+)\u0060/)![1]!,
      [...ddl.matchAll(/REFERENCES \u0060([a-zA-Z0-9_]+)\u0060/g)].map((m) => m[1]!)
    ])
  );
  if (mode === "incremental") {
    const visiting = new Set<string>();
    const visit = (table: string) => {
      if (ordered.includes(table)) return;
      // Self-references and table cycles are resolved at row level below.
      if (visiting.has(table)) return;
      visiting.add(table);
      for (const parent of dependencies.get(table) || [])
        if (dependencies.has(parent)) visit(parent);
      visiting.delete(table);
      ordered.push(table);
    };
    for (const table of dependencies.keys()) visit(table);
  }
  const inserts = commands
    .filter((s) => s.startsWith("INSERT INTO "))
    .sort(
      (a, b) =>
        ordered.indexOf(a.match(/^INSERT INTO \u0060([a-zA-Z0-9_]+)\u0060/)![1]!) -
        ordered.indexOf(b.match(/^INSERT INTO \u0060([a-zA-Z0-9_]+)\u0060/)![1]!)
    );
  // Save a recoverable pre-restore copy before the first destination write.
  const safetyBackupId = await input.safetyBackup();
  let inserted = 0,
    updated = 0;
  try {
    if (mode === "fresh") {
      await connection.query("SET FOREIGN_KEY_CHECKS=0");
      for (const t of tables) await connection.query("DROP TABLE " + quote(String(t.TABLE_NAME)));
      for (const command of commands) await connection.query(command);
    } else {
      await connection.beginTransaction();
      let pending = inserts;
      while (pending.length) {
        const deferred: string[] = [];
        for (const sql of pending) {
          try {
            const m = sql.match(
              /^INSERT INTO \u0060([a-zA-Z0-9_]+)\u0060 \((.*?)\) VALUES \((.*)\)$/s
            )!;
            const table = m[1]!,
              columns = [...m[2]!.matchAll(/\u0060([a-zA-Z0-9_]+)\u0060/g)].map((x) => x[1]!);
            const values = m[3]!.match(
              /X'[a-f0-9]*'|'(?:\\.|''|[^'\\])*'|NULL|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi
            )!;
            if (columns.length !== values.length) throw new Error("Invalid backup row.");
            const keys = primaryKeys.get(table)!;
            if (keys.some((k) => !columns.includes(k)))
              throw new Error("Backup row is missing its primary key.");
            const where = keys
              .map((k) => quote(k) + " <=> " + values[columns.indexOf(k)])
              .join(" AND ");
            const [existing] = await connection.query<RowDataPacket[]>(
              "SELECT 1 FROM " + quote(table) + " WHERE " + where + " FOR UPDATE"
            );
            if (existing.length) {
              const changes = columns
                .map((c, i) => ({ c, value: values[i] }))
                .filter((x) => !keys.includes(x.c));
              if (changes.length)
                await connection.query(
                  "UPDATE " +
                    quote(table) +
                    " SET " +
                    changes.map((x) => quote(x.c) + "=" + x.value).join(",") +
                    " WHERE " +
                    where
                );
              updated++;
            } else {
              await connection.query(sql);
              inserted++;
            }
          } catch (error) {
            if ((error as { errno?: number }).errno === 1452) deferred.push(sql);
            else throw error;
          }
        }
        if (deferred.length === pending.length)
          throw new Error(
            "Backup rows contain missing or unresolved cyclic foreign-key references."
          );
        pending = deferred;
      }
      await connection.commit();
    }
  } catch (error) {
    if (mode === "incremental") await connection.rollback();
    throw new Error(
      "Restore failed. Pre-restore backup: " +
        safetyBackupId +
        ". " +
        (mode === "fresh"
          ? "Fresh restore may be partial. "
          : "Incremental row changes were rolled back. ") +
        (error instanceof Error ? error.message : "Database error."),
      { cause: error }
    );
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  }
  const [restored] = await connection.query<RowDataPacket[]>("SHOW TABLES");
  return {
    databaseName,
    mode,
    tableCount: restored.length,
    inserted,
    updated,
    safetyBackupId,
    restoredAt: new Date().toISOString()
  };
}
