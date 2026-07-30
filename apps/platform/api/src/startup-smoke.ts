import { connect } from "node:net";
import { createConnection } from "mysql2/promise";
import { env } from "./env.js";

export async function verifyStartupConnectivity() {
  await verifyDatabase();

  if (env.CXAPP_QUEUE_BACKEND === "bullmq-redis") {
    const redisUrl = new URL(env.CXAPP_REDIS_URL);
    await verifyTcpConnection(
      redisUrl.hostname,
      Number(redisUrl.port || (redisUrl.protocol === "rediss:" ? 6380 : 6379)),
      "Redis"
    );
  }

  if (env.MAIL_ENABLED === "1") {
    await verifyTcpConnection(env.MAIL_SMTP_HOST, env.MAIL_SMTP_PORT, "SMTP");
  }
}

async function verifyDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  });
  try {
    await connection.query("SELECT 1");
  } finally {
    await connection.end();
  }
}

function verifyTcpConnection(host: string, port: number, label: string) {
  return new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`${label} startup connectivity timed out at ${host}:${port}.`));
    }, 5_000);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(
        new Error(`${label} startup connectivity failed at ${host}:${port}.`, { cause: error })
      );
    });
  });
}
