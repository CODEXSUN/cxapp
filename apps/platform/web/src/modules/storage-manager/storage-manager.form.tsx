import { FolderPlusIcon, RefreshCwIcon, UploadIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import type { Tenant } from "../tenant";
import type { StorageBrowserState } from "./storage-manager.types";

export function StorageManagerForm({
  busy,
  onCreateFolder,
  onRefresh,
  onStateChange,
  onUpload,
  state,
  tenants
}: {
  busy: boolean;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onStateChange: (state: StorageBrowserState) => void;
  onUpload: (file: File) => void;
  state: StorageBrowserState;
  tenants: Tenant[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="w-36">
        <WorkspaceSelect
          value={state.scope}
          options={[
            { label: "App", value: "app" },
            { label: "Tenant", value: "tenant" }
          ]}
          onValueChange={(scope) =>
            onStateChange({
              ...state,
              path: "",
              scope: scope as StorageBrowserState["scope"],
              tenantId: tenants[0] ? String(tenants[0].id) : state.tenantId
            })
          }
        />
      </div>
      {state.scope === "tenant" ? (
        <div className="w-52">
          <WorkspaceSelect
            value={state.tenantId || (tenants[0] ? String(tenants[0].id) : "")}
            options={tenants.map((tenant) => ({
              label: tenant.tenantName,
              value: String(tenant.id)
            }))}
            onValueChange={(tenantId) => onStateChange({ ...state, path: "", tenantId })}
          />
        </div>
      ) : null}
      <div className="w-32">
        <WorkspaceSelect
          value={state.visibility}
          options={[
            { label: "Public", value: "public" },
            { label: "Private", value: "private" }
          ]}
          onValueChange={(visibility) =>
            onStateChange({
              ...state,
              path: "",
              visibility: visibility as StorageBrowserState["visibility"]
            })
          }
        />
      </div>
      <Button disabled={busy} variant="outline" onClick={onCreateFolder}>
        <FolderPlusIcon className="size-4" />
        Folder
      </Button>
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted/40">
        <UploadIcon className="size-4" />
        Upload
        <input
          className="hidden"
          disabled={busy}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </label>
      <Button disabled={busy} variant="outline" onClick={onRefresh}>
        <RefreshCwIcon className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
