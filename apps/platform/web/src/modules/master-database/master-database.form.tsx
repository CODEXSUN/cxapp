import { DownloadIcon, RefreshCwIcon, RotateCcwIcon, UploadIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";

export function MasterDatabaseForm({
  busy,
  loading,
  onBackup,
  onMigrate,
  onRefresh,
  onRestore
}: {
  busy: boolean;
  loading: boolean;
  onBackup: () => void;
  onMigrate: () => void;
  onRefresh: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button disabled={loading} variant="outline" onClick={onRefresh}>
        <RefreshCwIcon className="size-4" />
        Refresh
      </Button>
      <Button disabled={busy} variant="outline" onClick={onBackup}>
        <DownloadIcon className="size-4" />
        Backup
      </Button>
      <Button disabled={busy} variant="outline" onClick={onRestore}>
        <UploadIcon className="size-4" />
        Restore
      </Button>
      <Button disabled={busy} onClick={onMigrate}>
        <RotateCcwIcon className="size-4" />
        Migrate
      </Button>
    </div>
  );
}
