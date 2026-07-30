import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { PlatformActivityForm } from "./platform-activity.form";
import { usePlatformActivityQuery } from "./platform-activity.hooks";
import { PlatformActivityList } from "./platform-activity.list";

export function PlatformActivityWorkspace() {
  const query = usePlatformActivityQuery();
  return (
    <WorkspacePage
      title="Activity"
      description="Review recent platform access, subscription, tenant, and setup changes."
      technicalName="page.platform-activity"
      actions={
        <PlatformActivityForm loading={query.isLoading} onRefresh={() => void query.refetch()} />
      }
    >
      <PlatformActivityList records={query.data ?? []} />
    </WorkspacePage>
  );
}
