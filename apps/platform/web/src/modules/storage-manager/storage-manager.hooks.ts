import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStorageFolder,
  downloadStorageFile,
  getStorageRoots,
  listStorage,
  uploadStorageFile
} from "./storage-manager.services";
import type { StorageBrowserState } from "./storage-manager.types";

export const storageManagerQueryKey = ["admin", "storage-manager"] as const;

export function useStorageRootsQuery() {
  return useQuery({
    queryFn: getStorageRoots,
    queryKey: [...storageManagerQueryKey, "roots"],
    refetchInterval: 30_000
  });
}

export function useStorageListingQuery(state: StorageBrowserState) {
  return useQuery({
    queryFn: () => listStorage(state),
    queryKey: [...storageManagerQueryKey, "list", state],
    refetchInterval: 15_000
  });
}

export function useStorageMutations(state: StorageBrowserState) {
  const client = useQueryClient();
  const done = () => void client.invalidateQueries({ queryKey: storageManagerQueryKey });
  return {
    createFolder: useMutation({
      mutationFn: (name: string) => createStorageFolder(state, name),
      onSuccess: done
    }),
    download: useMutation({ mutationFn: (file: string) => downloadStorageFile(state, file) }),
    upload: useMutation({
      mutationFn: (file: File) => uploadStorageFile(state, file),
      onSuccess: done
    })
  };
}
