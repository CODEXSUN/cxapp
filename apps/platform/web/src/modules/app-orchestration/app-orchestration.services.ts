import { apiGet } from "../../shared/api/platform-api";
import type { OrchestratedApp } from "./app-orchestration.types";
export const listOrchestratedApps = () => apiGet<OrchestratedApp[]>("/admin/app-operations", "sa");
