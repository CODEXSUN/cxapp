import { useQuery } from "@tanstack/react-query";
import { listPincodes, listPincodeCityOptions } from "./pincode.services";
export const pincodeQueryKey = ["core", "common", "location", "pincode"] as const;
export function usePincodes() {
  return useQuery({ queryFn: () => listPincodes(), queryKey: pincodeQueryKey });
}
export function usePincodeCityOptions() {
  return useQuery({
    queryFn: listPincodeCityOptions,
    queryKey: [...pincodeQueryKey, "city-options"]
  });
}
