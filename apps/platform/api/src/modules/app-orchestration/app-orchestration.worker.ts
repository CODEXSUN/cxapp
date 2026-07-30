export async function processAppHealthSample(appId: string) {
  return { appId, processed: true, sampledAt: new Date().toISOString() };
}
