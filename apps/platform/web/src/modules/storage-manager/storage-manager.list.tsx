import { formatDistanceToNow } from "date-fns";
import {
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  HardDriveIcon,
  ImageIcon,
  LinkIcon
} from "lucide-react";
import { StatusBadge } from "@codexsun/ui";
import { Button } from "@codexsun/ui/components/button";
import type {
  StorageBrowserState,
  StorageEntry,
  StorageListing,
  StorageRootSummary
} from "./storage-manager.types";
import { fileSizeLabel } from "./storage-manager.schema";

export function StorageManagerList({
  listing,
  onDownload,
  onOpenFolder,
  onPathChange,
  roots,
  state
}: {
  listing: StorageListing | undefined;
  onDownload: (file: string) => void;
  onOpenFolder: (path: string) => void;
  onPathChange: (path: string) => void;
  roots: StorageRootSummary | undefined;
  state: StorageBrowserState;
}) {
  const parts = (listing?.currentPath || "").split("/").filter(Boolean);
  return (
    <section className="grid min-h-[34rem] gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="rounded-md border bg-card shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">Storage roots</div>
        <RootButton
          active={state.scope === "app"}
          icon={HardDriveIcon}
          label="Application"
          value={roots?.app.root ?? "storage/app"}
        />
        {roots?.tenants.slice(0, 8).map((tenant) => (
          <RootButton
            active={state.scope === "tenant" && state.tenantId === String(tenant.tenantId)}
            icon={FolderIcon}
            key={tenant.tenantId}
            label={tenant.tenantName}
            value={tenant.root}
          />
        ))}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <LinkIcon className="size-4" />
            Public link
          </div>
          <div className="mt-2 break-all">
            {roots?.publicLink.link ?? "apps/platform/web/public/storage"}
          </div>
          <div className="mt-2">
            <StatusBadge tone={roots?.publicLink.status === "failed" ? "red" : "green"}>
              {roots?.publicLink.status ?? "checking"}
            </StatusBadge>
          </div>
        </div>
      </aside>
      <div className="min-w-0 rounded-md border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3 text-sm">
          <button
            className="rounded-md border bg-background px-2 py-1 hover:bg-muted"
            type="button"
            onClick={() => onPathChange("")}
          >
            {state.scope === "app" ? "app" : "tenant"}
          </button>
          {parts.map((part, index) => {
            const nextPath = parts.slice(0, index + 1).join("/");
            return (
              <button
                className="rounded-md border bg-background px-2 py-1 hover:bg-muted"
                key={nextPath}
                type="button"
                onClick={() => onPathChange(nextPath)}
              >
                {part}
              </button>
            );
          })}
          <StatusBadge tone={state.visibility === "private" ? "blue" : "green"}>
            {state.visibility}
          </StatusBadge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Kind</th>
                <th className="px-4 py-3 text-left font-semibold">Size</th>
                <th className="px-4 py-3 text-left font-semibold">Modified</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {listing?.entries.map((entry) => (
                <tr className="border-t" key={entry.path}>
                  <td className="px-4 py-3">
                    <button
                      className="flex max-w-md items-center gap-3 truncate text-left font-medium hover:text-primary"
                      type="button"
                      onClick={() =>
                        entry.type === "folder" ? onOpenFolder(entry.path) : undefined
                      }
                    >
                      <EntryIcon entry={entry} />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.type === "folder" ? "Folder" : entry.extension || "File"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.type === "folder" ? "-" : fileSizeLabel(entry.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.modifiedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.type === "file" ? (
                      <Button size="sm" variant="outline" onClick={() => onDownload(entry.path)}>
                        <DownloadIcon className="size-4" />
                        Download
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(listing?.entries.length ?? 0) === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              This folder is empty.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RootButton({
  active,
  icon: Icon,
  label,
  value
}: {
  active: boolean;
  icon: typeof HardDriveIcon;
  label: string;
  value: string;
}) {
  return (
    <div className={`border-b px-4 py-3 ${active ? "bg-muted/50" : ""}`}>
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate text-xs text-muted-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function EntryIcon({ entry }: { entry: StorageEntry }) {
  if (entry.type === "folder") return <FolderIcon className="size-5 text-amber-600" />;
  if (["svg", "png", "jpg", "jpeg", "webp"].includes(entry.extension))
    return <ImageIcon className="size-5 text-emerald-600" />;
  if (entry.extension === "sql") return <DatabaseIcon className="size-5 text-blue-600" />;
  return <FileTextIcon className="size-5 text-muted-foreground" />;
}
