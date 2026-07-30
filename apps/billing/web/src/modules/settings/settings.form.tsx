import { Save } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFormField, WorkspaceFormPanel, WorkspaceSelect } from "@codexsun/ui/workspace";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import type { BillingDocumentLayoutSettings, BillingSettings } from "./settings.types";

const layoutKeys: Array<keyof BillingDocumentLayoutSettings> = [
  "usePo",
  "useDc",
  "useColour",
  "useSize",
  "useEinvoice",
  "useEway"
];

export function SalesSettingsForm({
  loading,
  onChange,
  onSave,
  settings
}: {
  loading: boolean;
  onChange: (settings: BillingSettings) => void;
  onSave: () => void;
  settings: BillingSettings;
}) {
  function patchLayout(key: keyof BillingDocumentLayoutSettings, checked: boolean) {
    onChange({
      ...settings,
      layout: {
        ...settings.layout,
        [key]: checked
      }
    });
  }

  return (
    <WorkspaceFormPanel title="Billing settings">
      <div className="space-y-4">
        <WorkspaceFormField label="GST mode">
          <WorkspaceSelect
            value={settings.gstApiMode}
            options={[
              { label: "E-Invoice + E-Way", value: "einvoice_eway" },
              { label: "E-Way only", value: "eway_only" }
            ]}
            onValueChange={(gstApiMode) =>
              onChange({ ...settings, gstApiMode: gstApiMode as BillingSettings["gstApiMode"] })
            }
          />
        </WorkspaceFormField>
        <div className="space-y-3">
          {layoutKeys.map((key) => (
            <WorkspaceSwitchCard
              checked={settings.layout[key]}
              key={key}
              label={key.replace(/^use/, "")}
              onCheckedChange={(checked) => patchLayout(key, checked)}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end border-t pt-4">
        <Button type="button" disabled={loading} onClick={onSave}>
          <Save className="size-4" />
          Save
        </Button>
      </div>
    </WorkspaceFormPanel>
  );
}
