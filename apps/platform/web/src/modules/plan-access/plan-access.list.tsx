import { CheckIcon, XIcon } from "lucide-react";
import type { PlanAccessApp } from "./plan-access.types";

export function PlanAccessList({
  apps,
  selectedKeys,
  onToggle
}: {
  apps: PlanAccessApp[];
  selectedKeys: string[];
  onToggle: (moduleKey: string, enabled: boolean) => void;
}) {
  const selected = new Set(selectedKeys);
  return (
    <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">App</th>
            <th className="px-4 py-3 text-left font-semibold">Module key</th>
            <th className="px-4 py-3 text-left font-semibold">Included</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => {
            const locked = app.moduleKey === "platform.application";
            const checked = selected.has(app.moduleKey);
            return (
              <tr className="border-t" key={app.moduleKey}>
                <td className="px-4 py-3 font-medium">{app.appLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">{app.moduleKey}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onToggle(app.moduleKey, !checked)}
                    className={`inline-flex h-8 min-w-24 items-center justify-center gap-2 rounded-md border px-3 text-sm ${checked ? "bg-primary text-primary-foreground" : "bg-background"} ${locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                  >
                    {checked ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
                    {checked ? "Included" : "Off"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
