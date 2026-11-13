import assert from "node:assert/strict";
import test from "node:test";
import { saveBackupInFolder } from "../apps/platform/web/src/modules/database-backups/backup-local-files.js";
test("writes the complete backup to the selected folder and closes the file", async () => {
  let name = "",
    content = "",
    closed = false;
  const folder = {
    getFileHandle: async (filename: string, options: { create: boolean }) => {
      name = filename;
      assert.equal(options.create, true);
      return {
        createWritable: async () => ({
          write: async (value: string) => {
            content = value;
          },
          close: async () => {
            closed = true;
          },
          abort: async () => {}
        })
      };
    }
  };
  const artifact = { id: "backup", sql: "CREATE TABLE sample(id INT);" };
  await saveBackupInFolder(
    folder as unknown as FileSystemDirectoryHandle,
    "master.cxbackup",
    artifact
  );
  assert.equal(name, "master.cxbackup");
  assert.deepEqual(JSON.parse(content), artifact);
  assert.equal(closed, true);
});
test("aborts failed writes and reports the error so the UI can offer a download", async () => {
  let aborted = false;
  const folder = {
    getFileHandle: async () => ({
      createWritable: async () => ({
        write: async () => {
          throw new Error("permission lost");
        },
        close: async () => {},
        abort: async () => {
          aborted = true;
        }
      })
    })
  };
  await assert.rejects(
    saveBackupInFolder(folder as unknown as FileSystemDirectoryHandle, "master.cxbackup", {}),
    /permission lost/
  );
  assert.equal(aborted, true);
});
