import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function envValues(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

test("development and deployment samples own independent runtime endpoints", async () => {
  const development = envValues(await read(".env.example"));
  const deployment = envValues(await read(".container/deploy.env.sample"));

  assert.equal(development.NODE_ENV, "development");
  assert.equal(development.PLATFORM_API_PORT, "7010");
  assert.equal(development.PLATFORM_WEB_PORT, "7020");
  assert.equal(development.DB_HOST, "127.0.0.1");
  assert.equal(development.CXAPP_QUEUE_BACKEND, "database");
  assert.equal(development.CXAPP_IMAGE_REGISTRY, undefined);

  assert.equal(deployment.NODE_ENV, "production");
  assert.equal(deployment.PLATFORM_API_PORT, "17010");
  assert.equal(deployment.PLATFORM_WEB_PORT, "17020");
  assert.equal(deployment.DB_HOST, "cxapp-mariadb");
  assert.equal(deployment.CXAPP_QUEUE_BACKEND, "bullmq-redis");
  assert.equal(deployment.CXAPP_IMAGE_REGISTRY, "cxapp");
});

test("container tooling and Compose consume deploy.env only", async () => {
  const common = await read(".container/scripts/common.sh");
  const compose = await read(".container/billing/docker-compose.yml");

  assert.match(common, /DEPLOY_ENV=\$CONTAINER_DIR\/deploy\.env/u);
  assert.doesNotMatch(common, /DEPLOY_ENV=\$PROJECT_ROOT\/\.env/u);
  assert.match(compose, /\.\.\/deploy\.env/u);
  assert.doesNotMatch(compose, /\.\.\/\.\.\/\.env/u);
});

test("guarded updates enforce reproducible versions and recoverable deployment evidence", async () => {
  const deployment = envValues(await read(".container/deploy.env.sample"));
  const update = await read(".container/update.sh");

  assert.equal(deployment.CXAPP_MIGRATION_COMPATIBLE_VERSION, deployment.CXAPP_VERSION);
  assert.equal(deployment.CXAPP_UPDATE_BACKUP_RETENTION, "10");
  assert.match(update, /flock -n 9/u);
  assert.match(update, /BILLING_STACK_MIGRATIONS_IMAGE_TAG/u);
  assert.match(update, /--allow-dirty/u);
  assert.match(update, /sha256sum --check/u);
  assert.match(update, /CXAPP_UPDATE_MIN_DOCKER_FREE_MB/u);
  assert.match(update, /cxapp-deployment-\$timestamp\.json/u);
});

test("cloud environment preparation is separate from setup and never copies local env", async () => {
  const setup = await read("setup.sh");
  const prepare = await read("prepare-env.sh");
  const configurator = await read("tools/configure-env.mjs");

  assert.match(setup, /prepare-env\.sh" --check/u);
  assert.doesNotMatch(setup, /copy-local|Refresh compatible|run_environment_tool/u);
  assert.match(prepare, /--deployment/u);
  assert.match(prepare, /\.container\/deploy\.env\.sample/u);
  assert.doesNotMatch(prepare, /--copy-local/u);
  assert.doesNotMatch(configurator, /--copy-local|localCopyKeys|localSecretCopyKeys/u);
});
