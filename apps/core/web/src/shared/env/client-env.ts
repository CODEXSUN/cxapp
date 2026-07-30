export function requiredClientEnv(name: string): string {
  const value = window.__CODEXSUN_RUNTIME_CONFIG__?.[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required client environment value: ${name}`);
  }
  return value.trim();
}
