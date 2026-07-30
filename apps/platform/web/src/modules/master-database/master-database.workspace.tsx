import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { MasterDatabaseForm } from "./master-database.form";
import { useMasterDatabaseMutations, useMasterDatabaseQuery } from "./master-database.hooks";
import { MasterDatabaseList } from "./master-database.list";

export function MasterDatabaseWorkspace() {
  const query = useMasterDatabaseQuery();
  const mutations = useMasterDatabaseMutations();
  const busy =
    mutations.backup.isPending || mutations.migrate.isPending || mutations.restore.isPending;
  return (
    <WorkspacePage
      title="Master Database"
      description="Monitor the platform master database, migration state, backup requests, and restore readiness."
      technicalName="page.database.master"
      actions={
        <MasterDatabaseForm
          busy={busy}
          loading={query.isLoading}
          onBackup={() => mutations.backup.mutate()}
          onMigrate={() => mutations.migrate.mutate()}
          onRefresh={() => void query.refetch()}
          onRestore={() => mutations.restore.mutate()}
        />
      }
    >
      <MasterDatabaseList record={query.data} />
    </WorkspacePage>
  );
}
