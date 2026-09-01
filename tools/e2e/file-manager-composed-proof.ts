import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";

export async function exerciseComposedFileManager(
  app: FastifyInstance,
  cookie: string,
  applicationHost: URL
) {
  const headers = {
    cookie,
    host: applicationHost.host,
    origin: applicationHost.origin
  };
  const unauthenticated = await app.inject({ method: "GET", url: "/file-manager/providers" });
  assert.equal(unauthenticated.statusCode, 401);

  const providers = await app.inject({ headers, method: "GET", url: "/file-manager/providers" });
  assert.equal(providers.statusCode, 200, providers.body);
  assert.ok(providers.json().some((provider: { key: string }) => provider.key === "local"));

  const run = `${Date.now().toString(36)}${process.pid.toString(36)}`.slice(-12);
  const folderResponse = await app.inject({
    headers,
    method: "POST",
    payload: { name: `Composed proof ${run}`, parentUuid: null },
    url: "/file-manager/folders"
  });
  assert.equal(folderResponse.statusCode, 201, folderResponse.body);
  const folderUuid = folderResponse.json().uuid as string;
  let fileUuid: string | null = null;

  try {
    const content = Buffer.from(`composed-file-manager-${run}`);
    const upload = await app.inject({
      headers: {
        ...headers,
        "content-type": `multipart/form-data; boundary=cxapp-${run}`
      },
      method: "POST",
      payload: multipart(`cxapp-${run}`, folderUuid, content),
      url: "/file-manager/files/upload"
    });
    assert.equal(upload.statusCode, 201, upload.body);
    fileUuid = upload.json().uuid as string;

    const listed = await app.inject({
      headers,
      method: "GET",
      url: `/file-manager/files?folderUuid=${folderUuid}`
    });
    assert.ok(listed.json().some((file: { uuid: string }) => file.uuid === fileUuid));

    const contentResponse = await app.inject({
      headers,
      method: "GET",
      url: `/file-manager/files/${fileUuid}/content`
    });
    assert.deepEqual(contentResponse.rawPayload, content);

    const download = await app.inject({
      headers,
      method: "GET",
      url: `/file-manager/files/${fileUuid}/download`
    });
    assert.match(String(download.headers["content-disposition"]), /^attachment;/u);
  } finally {
    if (fileUuid) {
      const removed = await app.inject({
        headers,
        method: "DELETE",
        url: `/file-manager/files/${fileUuid}`
      });
      assert.equal(removed.statusCode, 200, removed.body);
    }
    const removedFolder = await app.inject({
      headers,
      method: "DELETE",
      url: `/file-manager/folders/${folderUuid}`
    });
    assert.equal(removedFolder.statusCode, 200, removedFolder.body);
  }
}

function multipart(boundary: string, folderUuid: string, content: Buffer) {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="folderUuid"\r\n\r\n${folderUuid}\r\n`
    ),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.txt"\r\nContent-Type: text/plain\r\n\r\n`
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
}
