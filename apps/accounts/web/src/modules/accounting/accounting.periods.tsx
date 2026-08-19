import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import { useAccountingPeriods } from "./accounting.hooks";
import { formatDate, setPeriodStatus } from "./accounting.services";
import type { AccountingPeriod } from "./accounting.types";

export function AccountingPeriodsWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  void initialRecordId;
  const queryClient = useQueryClient();
  const query = useAccountingPeriods();
  const periods = query.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountingPeriod["status"] }) =>
      setPeriodStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "periods"] });
      toast.success("Period status updated");
    },
    onError: (error) => {
      toast.error("Period status could not be updated", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  return (
    <WorkspacePage
      title="Accounting Periods"
      description="Open, close, or lock accounting periods for the current financial year."
      technicalName="page.accounts.periods"
      actions={
        <Button
          className="h-9 rounded-md"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <WorkspaceTablePanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Name", "Start", "End", "Status", "Action"].map((heading) => (
                  <th
                    key={heading}
                    className={cn(
                      "border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      heading === "Action" ? "text-right" : "text-left"
                    )}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{period.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(period.startDate)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(period.endDate)}</td>
                  <td className="px-4 py-2.5">
                    <PeriodStatusPill status={period.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {period.isSystem ? (
                      <span className="text-xs text-muted-foreground">System period</span>
                    ) : (
                      <Button
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            id: period.id,
                            status: period.status === "open" ? "closed" : "open"
                          })
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {period.status === "open" ? "Close" : "Reopen"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {periods.length === 0 && query.isLoading ? <WorkspaceTableLoadingState /> : null}
        {periods.length === 0 && !query.isLoading ? (
          <WorkspaceTableEmptyState>No accounting periods found.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>
    </WorkspacePage>
  );
}

export function PeriodStatusPill({ status }: { status: AccountingPeriod["status"] }) {
  const tone = status === "open" ? "success" : status === "closed" ? "warning" : "danger";
  return <WorkspaceStatusBadge label={status} tone={tone} />;
}