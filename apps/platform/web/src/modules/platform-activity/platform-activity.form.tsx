import { RefreshCwIcon } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";

export function PlatformActivityForm({
  loading,
  onRefresh
}: {
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Button disabled={loading} variant="outline" onClick={onRefresh}>
      <RefreshCwIcon className="size-4" />
      Refresh
    </Button>
  );
}
