export type OrchestratedAppId = "platform";
export type OrchestratedAppStatus = "online" | "partial" | "offline";
export interface OrchestratedService {
  id: "api" | "web";
  label: string;
  host: string;
  managedPid: number | null;
  port: number;
  online: boolean;
  responseMs: number | null;
  uptimeSeconds: number | null;
}
export interface OrchestratedApp {
  id: OrchestratedAppId;
  label: string;
  description: string;
  status: OrchestratedAppStatus;
  managed: boolean;
  terminalPid: number | null;
  uptimeSeconds: number | null;
  lastAction: string | null;
  services: OrchestratedService[];
}
