import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import { decryptMailSecret, encryptMailSecret } from "./mail.secrets.js";
import { shouldImportInboundMessage } from "./mail.sync.js";
import { processMailJob } from "./mail.worker.js";
import { openSystemMailPayload, sealSystemMailPayload } from "./mail.system-payload.js";

test("tenant mail secrets round-trip without persisting plaintext", () => {
  const plaintext = "tenant-smtp-password";
  const encrypted = encryptMailSecret(plaintext, "test-secret-key");

  assert.notEqual(encrypted, plaintext);
  assert.match(encrypted, /^v1\./);
  assert.equal(decryptMailSecret(encrypted, "test-secret-key"), plaintext);
});

test("inbound synchronization rejects provider duplicates", () => {
  const known = new Set(["provider-message-1"]);

  assert.equal(shouldImportInboundMessage("provider-message-1", known), false);
  assert.equal(shouldImportInboundMessage("provider-message-2", known), true);
  assert.equal(shouldImportInboundMessage("", known), false);
});

test("system mail queue payloads do not retain plaintext reset links", () => {
  const sealed = sealSystemMailPayload(
    { bodyText: "https://codexsun.test/reset-password?token=raw-token" },
    "system-mail-secret"
  );

  assert.doesNotMatch(JSON.stringify(sealed), /raw-token/);
  assert.deepEqual(openSystemMailPayload(sealed, "system-mail-secret"), {
    bodyText: "https://codexsun.test/reset-password?token=raw-token"
  });
});

test("system mail is delivered through the configured SMTP transport", async (context) => {
  let received = "";
  const server = createServer((socket) => {
    let buffer = "";
    let readingData = false;
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const boundary = buffer.indexOf("\r\n");
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (readingData) {
          if (line === ".") {
            readingData = false;
            socket.write("250 accepted\r\n");
          } else {
            received += `${line}\n`;
          }
        } else if (/^EHLO /i.test(line)) {
          socket.write("250-localhost\r\n250 PIPELINING\r\n");
        } else if (/^DATA$/i.test(line)) {
          readingData = true;
          socket.write("354 end with <CRLF>.<CRLF>\r\n");
        } else if (/^QUIT$/i.test(line)) {
          socket.end("221 bye\r\n");
        } else {
          socket.write("250 ok\r\n");
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const result = await processMailJob(
    "mail.system-send",
    {
      bodyText: "Your password reset link is ready.",
      subject: "Reset your CODEXSUN password",
      to: ["recovery-test@example.test"]
    },
    {
      fallback: {
        enabled: true,
        fromEmail: "no-reply@codexsun.test",
        fromName: "CODEXSUN",
        host: "127.0.0.1",
        password: "",
        port: address.port,
        replyTo: "",
        secure: false,
        username: ""
      },
      secretKey: "mail-system-test"
    }
  );

  assert.ok("provider" in result);
  assert.equal(result.provider, "environment");
  assert.match(received, /Subject: Reset your CODEXSUN password/);
  assert.match(received, /recovery-test@example\.test/);
  assert.match(received, /Your password reset link is ready\./);
});
