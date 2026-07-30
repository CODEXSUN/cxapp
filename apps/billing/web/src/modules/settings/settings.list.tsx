import {
  WorkspaceStatusBadge,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace";
import type { BillingSettings } from "./settings.types";

export function SettingsList({ settings }: { settings: BillingSettings }) {
  const rows = [
    ["PO", settings.layout.usePo],
    ["DC", settings.layout.useDc],
    ["Colour", settings.layout.useColour],
    ["Size", settings.layout.useSize],
    ["E-Invoice", settings.layout.useEinvoice],
    ["E-Way", settings.layout.useEway]
  ] as const;

  return (
    <WorkspaceTablePanel>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/45">
          <tr>
            <WorkspaceTableHeaderCell>Setting</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, enabled]) => (
            <tr className="border-b border-border/70 last:border-0" key={label}>
              <td className="px-4 py-2.5 font-medium">{label}</td>
              <td className="px-4 py-2.5">
                <WorkspaceStatusBadge
                  label={enabled ? "Enabled" : "Off"}
                  tone={enabled ? "success" : "neutral"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WorkspaceTablePanel>
  );
}
