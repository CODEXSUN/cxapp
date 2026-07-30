import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listWorkOrders } from "./work-order.services";

export function useWorkOrders(search = "") {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listWorkOrders(search),
    queryKey: ["core", "work-order", "list", search]
  });
}
