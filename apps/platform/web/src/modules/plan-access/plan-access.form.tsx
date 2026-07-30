import { SaveIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFormBanner } from "@codexsun/ui/workspace/upsert";
import { PlanAccessList } from "./plan-access.list";
import type { PlanAccessApp } from "./plan-access.types";

export function PlanAccessForm({
  apps,
  error,
  saving,
  selectedKeys,
  onSave,
  onToggle
}: {
  apps: PlanAccessApp[];
  error?: string | undefined;
  saving: boolean;
  selectedKeys: string[];
  onSave: () => void;
  onToggle: (moduleKey: string, enabled: boolean) => void;
}) {
  return (
    <section className="space-y-4">
      {error ? <WorkspaceFormBanner title="Unable to save">{error}</WorkspaceFormBanner> : null}
      <PlanAccessList apps={apps} selectedKeys={selectedKeys} onToggle={onToggle} />
      <div className="flex justify-end">
        <Button disabled={saving} onClick={onSave}>
          <SaveIcon className="size-4" />
          Save access
        </Button>
      </div>
    </section>
  );
}
