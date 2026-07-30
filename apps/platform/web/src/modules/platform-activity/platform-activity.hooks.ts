import { useQuery } from "@tanstack/react-query";
import { listPlatformActivity } from "./platform-activity.services";

export const platformActivityQueryKey = ["admin", "platform-activity"] as const;

export function usePlatformActivityQuery() {
  return useQuery({ queryFn: listPlatformActivity, queryKey: platformActivityQueryKey });
}
