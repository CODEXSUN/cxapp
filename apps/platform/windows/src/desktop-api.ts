import { invoke } from "@tauri-apps/api/core";

export type DesktopConfig = {
  apiMode: "local" | "cloud";
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  databaseUser: string;
};

export const defaultDesktopConfig: DesktopConfig = {
  apiMode: "local",
  databaseHost: "127.0.0.1",
  databasePort: 3306,
  databaseName: "cxapp_tenant",
  databaseUser: "cxapp"
};

export type WorkspaceProjection = {
  companyName: string | null;
  corporateId: string;
  connectedAt: string;
  tenantName: string;
};

export function loadWorkspaceProjection(): Promise<WorkspaceProjection | null> {
  return invoke<WorkspaceProjection | null>("load_workspace_projection");
}

export function openWorkspace(): Promise<void> {
  return invoke("open_workspace");
}

export function loadDesktopConfig(): Promise<DesktopConfig> {
  return invoke("load_desktop_config");
}

export function saveDesktopConfig(config: DesktopConfig): Promise<DesktopConfig> {
  return invoke("save_desktop_config", { config });
}

export function testLocalDatabase(config: DesktopConfig): Promise<void> {
  return invoke("test_local_database", { config });
}
