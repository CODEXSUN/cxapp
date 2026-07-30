import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAccessControl,
  saveAccessPermission,
  saveAccessRole,
  saveAccessUser
} from "./access-control.services";

export const accessControlQueryKey = ["admin", "access-control"] as const;
export function useAccessControlQuery() {
  return useQuery({ queryFn: getAccessControl, queryKey: accessControlQueryKey });
}
export function useAccessControlMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: accessControlQueryKey });
  return {
    permission: useMutation({ mutationFn: saveAccessPermission, onSuccess: done }),
    role: useMutation({ mutationFn: saveAccessRole, onSuccess: done }),
    user: useMutation({ mutationFn: saveAccessUser, onSuccess: done })
  };
}
