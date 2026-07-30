export type PlatformNodeEnvironment = "development" | "test" | "staging" | "production";

type PlatformRuntimeInput = {
  NODE_ENV: string;
  PLATFORM_API_PORT: number;
};

export function resolvePlatformRuntime(input: PlatformRuntimeInput) {
  const environment = requireNodeEnvironment(input.NODE_ENV);
  return {
    apiBindHost: platformBindHost(environment),
    apiUrl: platformApiUrl(input.PLATFORM_API_PORT),
    webBindHost: platformBindHost(environment)
  };
}

export function platformApiUrl(port: number) {
  return `http://127.0.0.1:${requirePort(port, "PLATFORM_API_PORT")}`;
}

export function platformWebAllowedHosts(origin: string) {
  const hostname = new URL(origin).hostname;
  return Array.from(new Set([hostname, "localhost", "127.0.0.1"]));
}

function platformBindHost(environment: PlatformNodeEnvironment) {
  return environment === "production" || environment === "staging" ? "0.0.0.0" : "127.0.0.1";
}

function requireNodeEnvironment(environment: string): PlatformNodeEnvironment {
  if (
    environment !== "development" &&
    environment !== "test" &&
    environment !== "staging" &&
    environment !== "production"
  ) {
    throw new Error(`NODE_ENV has an unsupported value: ${environment}`);
  }
  return environment;
}

function requirePort(port: number, key: string) {
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`${key} must be an integer between 1 and 65535.`);
  }
  return port;
}
