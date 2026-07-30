import { useQuery } from "@tanstack/react-query";
import { listDistricts, listDistrictStateOptions } from "./district.services";
export const districtQueryKey = ["core", "common", "location", "district"] as const;
export function useDistricts() {
  return useQuery({ queryFn: () => listDistricts(), queryKey: districtQueryKey });
}
export function useDistrictStateOptions() {
  return useQuery({
    queryFn: listDistrictStateOptions,
    queryKey: [...districtQueryKey, "state-options"]
  });
}
