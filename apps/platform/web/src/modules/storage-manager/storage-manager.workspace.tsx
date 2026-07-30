import { useMemo, useState } from "react";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { StorageManagerForm } from "./storage-manager.form";
import {
  useStorageListingQuery,
  useStorageMutations,
  useStorageRootsQuery
} from "./storage-manager.hooks";
import { StorageManagerList } from "./storage-manager.list";
import { cleanStorageState } from "./storage-manager.schema";
import type { StorageBrowserState } from "./storage-manager.types";
import { useTenantsQuery } from "../tenant";

export function StorageManagerWorkspace() {
  const tenants = useTenantsQuery();
  const firstTenantId = tenants.data?.[0] ? String(tenants.data[0].id) : "";
  const [state, setState] = useState<StorageBrowserState>({
    path: "",
    scope: "app",
    tenantId: firstTenantId,
    visibility: "public"
  });
  const resolvedState = useMemo(
    () => cleanStorageState({ ...state, tenantId: state.tenantId || firstTenantId }),
    [firstTenantId, state]
  );
  const roots = useStorageRootsQuery();
  const listing = useStorageListingQuery(resolvedState);
  const mutations = useStorageMutations(resolvedState);
  const busy =
    roots.isLoading ||
    listing.isLoading ||
    mutations.createFolder.isPending ||
    mutations.download.isPending ||
    mutations.upload.isPending;

  function createFolder() {
    const name = window.prompt("Folder name");
    if (name?.trim()) mutations.createFolder.mutate(name.trim());
  }

  return (
    <WorkspacePage
      title="Storage Manager"
      description="Browse application and tenant storage with public/private boundaries and database backup folders in one place."
      technicalName="page.storage-manager"
      actions={
        <StorageManagerForm
          busy={busy}
          state={resolvedState}
          tenants={tenants.data ?? []}
          onCreateFolder={createFolder}
          onRefresh={() => {
            void roots.refetch();
            void listing.refetch();
          }}
          onStateChange={setState}
          onUpload={(file) => mutations.upload.mutate(file)}
        />
      }
    >
      <StorageManagerList
        listing={listing.data}
        roots={roots.data}
        state={resolvedState}
        onDownload={(file) => mutations.download.mutate(file)}
        onOpenFolder={(path) => setState((current) => ({ ...current, path }))}
        onPathChange={(path) => setState((current) => ({ ...current, path }))}
      />
    </WorkspacePage>
  );
}
