import { invoke } from "@tauri-apps/api/core";

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
