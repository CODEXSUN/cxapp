import { apiGet } from "../../shared/api/platform-api";
import type { PlatformActivity } from "./platform-activity.types";

export function listPlatformActivity() {
  return apiGet<PlatformActivity[]>("/admin/platform-activity", "sa");
}
