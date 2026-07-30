import { useQuery } from "@tanstack/react-query";
import { listCitys, listCityDistrictOptions } from "./city.services";
export const cityQueryKey = ["core", "common", "location", "city"] as const;
export function useCitys() {
  return useQuery({ queryFn: () => listCitys(), queryKey: cityQueryKey });
}
export function useCityDistrictOptions() {
  return useQuery({
    queryFn: listCityDistrictOptions,
    queryKey: [...cityQueryKey, "district-options"]
  });
}
