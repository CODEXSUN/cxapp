import { RefreshCwIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";

export function TenantAccessForm({
  loading,
  onRefresh
}: {
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex justify-end">
      <Button disabled={loading} variant="outline" onClick={onRefresh}>
        <RefreshCwIcon className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
