import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Industry, IndustrySavePayload } from "./industry.types";
type ApiIndustry = Omit<Industry, "moduleKeysText"> & { moduleKeys: string[] };
const fromApi = (value: ApiIndustry): Industry => ({
  ...value,
  moduleKeysText: value.moduleKeys.join(", ")
});
const toApi = (value: IndustrySavePayload) => ({
  ...value,
  moduleKeys: value.moduleKeysText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
});
export async function listIndustries() {
  return (await apiGet<ApiIndustry[]>("/admin/industries", "sa")).map(fromApi);
}
export async function createIndustry(payload: IndustrySavePayload) {
  return fromApi(await apiPost<ApiIndustry>("/admin/industries", toApi(payload), "sa"));
}
export async function updateIndustry(id: number, payload: IndustrySavePayload) {
  return fromApi(await apiPut<ApiIndustry>(`/admin/industries/${id}`, toApi(payload), "sa"));
}
