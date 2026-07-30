export type HealthCheck = {
  check(): Promise<HealthCheckResult> | HealthCheckResult;
  name: string;
};

export type HealthCheckResult = {
  details?: Record<string, unknown>;
  status: "degraded" | "down" | "ok";
};

export async function runHealthChecks(checks: HealthCheck[]) {
  const results: Record<string, HealthCheckResult> = {};
  let status: HealthCheckResult["status"] = "ok";

  for (const check of checks) {
    const result = await check.check();
    results[check.name] = result;

    if (result.status === "down") {
      status = "down";
    } else if (result.status === "degraded" && status === "ok") {
      status = "degraded";
    }
  }

  return {
    checks: results,
    status
  };
}
