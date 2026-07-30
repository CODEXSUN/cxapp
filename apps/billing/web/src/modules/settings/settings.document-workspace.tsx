import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { getDocumentSettings, saveDocumentSettings } from "./settings.services";
import { billingSettingsQueryKey, useCompanyContextId } from "./settings.hooks";
import {
  defaultBillingSettings,
  type BillingDocumentNumberSettings,
  type BillingNumberDocumentKind,
  type BillingSettings
} from "./settings.types";

const documents: Array<{ key: BillingNumberDocumentKind; label: string }> = [
  { key: "sales", label: "Sales" },
  { key: "quotation", label: "Quotation" },
  { key: "purchase", label: "Purchase" },
  { key: "exportSales", label: "Export Sales" },
  { key: "receipt", label: "Receipt" },
  { key: "payment", label: "Payment" }
];

export function DocumentSettingsWorkspace() {
  const queryClient = useQueryClient();
  const companyId = useCompanyContextId();
  const query = useQuery({
    enabled: Boolean(companyId),
    queryFn: getDocumentSettings,
    queryKey: ["billing", "document-settings", companyId]
  });
  const [form, setForm] = useState<BillingSettings["numbering"]>(defaultBillingSettings.numbering);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: saveDocumentSettings,
    onSuccess: async (settings) => {
      setForm(settings);
      await queryClient.invalidateQueries({
        queryKey: ["billing", "document-settings", companyId]
      });
      await queryClient.invalidateQueries({ queryKey: billingSettingsQueryKey(companyId) });
      toast.success("Document settings saved");
    },
    onError: (error) =>
      toast.error("Unable to save document settings", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });

  function patch(kind: BillingNumberDocumentKind, next: Partial<BillingDocumentNumberSettings>) {
    setForm((current) => ({ ...current, [kind]: { ...current[kind], ...next } }));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground/80">
            Document Settings
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground/70">
            Configure automatic document numbers for sales, quotations, purchases, export sales,
            receipts, and payments.
          </p>
        </div>
        <Button
          className="h-9 rounded-md"
          disabled={query.isLoading || mutation.isPending}
          onClick={() => mutation.mutate(form)}
          type="button"
        >
          <Save className="size-4" />
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
      {query.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Document settings could not be loaded."}
        </div>
      ) : null}
      <div className="space-y-4">
        {documents.map((document) => (
          <NumberingPanel
            key={document.key}
            label={document.label}
            settings={form[document.key]}
            onChange={(next) => patch(document.key, next)}
          />
        ))}
      </div>
    </section>
  );
}

function NumberingPanel({
  label,
  onChange,
  settings
}: {
  label: string;
  onChange: (next: Partial<BillingDocumentNumberSettings>) => void;
  settings: BillingDocumentNumberSettings;
}) {
  const preview = formatDocumentNumber(settings);
  return (
    <section className="rounded-md border border-border/70 bg-card/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Next automatic number: <span className="font-semibold text-foreground">{preview}</span>
          </p>
        </div>
        <WorkspaceSwitchCard
          checked={settings.automatic}
          label="Automatic"
          onCheckedChange={(automatic) => onChange({ automatic })}
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TextOption
          label="Prefix"
          enabled={settings.usePrefix}
          value={settings.prefix}
          onEnabledChange={(usePrefix) => onChange({ usePrefix })}
          onValueChange={(prefix) => onChange({ prefix: prefix.toUpperCase() })}
        />
        <TextOption
          label="Separator"
          enabled={settings.useSeparator}
          value={settings.separator}
          onEnabledChange={(useSeparator) => onChange({ useSeparator })}
          onValueChange={(separator) => onChange({ separator })}
        />
        <TextOption
          label="Suffix"
          enabled={settings.useSuffix}
          value={settings.suffix}
          onEnabledChange={(useSuffix) => onChange({ useSuffix })}
          onValueChange={(suffix) => onChange({ suffix: suffix.toUpperCase() })}
        />
        <NumberOption
          label="Next number"
          min={1}
          value={settings.nextNumber}
          onChange={(nextNumber) => onChange({ nextNumber })}
        />
        <NumberOption
          label="Padding"
          min={1}
          max={12}
          value={settings.padding}
          onChange={(padding) => onChange({ padding })}
        />
      </div>
      <div className="mt-3 rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
        Saved preview: <span className="font-semibold text-foreground">{preview}</span>
      </div>
    </section>
  );
}

function TextOption({
  enabled,
  label,
  onEnabledChange,
  onValueChange,
  value
}: {
  enabled: boolean;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <WorkspaceSwitchCard checked={enabled} label={label} onCheckedChange={onEnabledChange} />
      <Input
        className="h-10 rounded-md"
        disabled={!enabled}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </div>
  );
}

function NumberOption({
  label,
  max,
  min,
  onChange,
  value
}: {
  label: string;
  max?: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="rounded-md border border-border/70 bg-background p-3">
      <span className="text-sm font-semibold">{label}</span>
      <Input
        className="mt-2 h-10 rounded-md"
        max={max}
        min={min}
        type="number"
        value={value}
        onChange={(event) =>
          onChange(
            Math.max(
              min,
              max
                ? Math.min(max, Number(event.target.value) || min)
                : Number(event.target.value) || min
            )
          )
        }
      />
    </label>
  );
}

export function formatDocumentNumber(settings: BillingDocumentNumberSettings) {
  const number = String(Math.max(1, settings.nextNumber)).padStart(
    Math.max(1, settings.padding),
    "0"
  );
  return `${settings.usePrefix ? settings.prefix : ""}${settings.useSeparator ? settings.separator : ""}${number}${settings.useSuffix ? settings.suffix : ""}`;
}
