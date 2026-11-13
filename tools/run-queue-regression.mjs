import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer, connect } from "node:net";
const ssh = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "codexsun-hostinger"];
const password = randomBytes(24).toString("hex"),
  name = "cxapp-queue-regression-redis-" + Date.now();
function run(args, input) {
  const p = spawn("ssh", [...ssh, ...args], { windowsHide: true });
  let err = "";
  p.stderr.on("data", (b) => (err += b));
  p.stdout.resume();
  p.stdin.end(input);
  return new Promise((ok, no) =>
    p.on("close", (c) => (c === 0 ? ok() : no(Error(err.slice(-500)))))
  );
}
const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
await new Promise((r) => server.close(r));
let tunnel;
try {
  await run(
    ["python3 -"],
    `import subprocess\nsubprocess.run(['docker','run','-d','--name',${JSON.stringify(name)},'-p','127.0.0.1:16389:6379','--memory','128m','cxapp/redis:7.4-cxapp-1.0.44','redis-server','--save','','--appendonly','no','--requirepass',${JSON.stringify(password)}],check=True,stdout=subprocess.DEVNULL)\n`
  );
  tunnel = spawn(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "ExitOnForwardFailure=yes",
      "-N",
      "-L",
      "127.0.0.1:" + port + ":127.0.0.1:16389",
      "codexsun-hostinger"
    ],
    { windowsHide: true, stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    const ok = await new Promise((r) => {
      const s = connect(port, "127.0.0.1");
      s.once("connect", () => {
        s.destroy();
        r(true);
      });
      s.once("error", () => r(false));
    });
    if (ok) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const child = spawn(process.execPath, ["--import", "tsx", "tools/queue-runtime-regression.ts"], {
    env: {
      ...process.env,
      CXAPP_TEST_REDIS_URL: "redis://:" + password + "@127.0.0.1:" + port + "/0"
    },
    windowsHide: true,
    stdio: "inherit"
  });
  const result = await new Promise((r) => child.on("close", r));
  process.exitCode = result;
} finally {
  tunnel?.kill();
  await run(["docker", "rm", "-f", name]);
}
