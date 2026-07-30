import { Button } from "@codexsun/ui";
import { RefreshCwIcon } from "lucide-react";
export function AppOrchestrationForm({
  busy,
  onRefresh
}: {
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={onRefresh}>
        <RefreshCwIcon className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
