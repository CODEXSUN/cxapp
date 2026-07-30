import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, WorkspacePage } from "@codexsun/ui";
import { DefaultCompanyForm } from "./default-company.form";
import {
  defaultCompanyQueryKey,
  useDefaultCompany,
  useDefaultCompanyLookups
} from "./default-company.hooks";
import { DefaultCompanyList } from "./default-company.list";
import { saveDefaultCompany } from "./default-company.services";
import type { DefaultCompanySavePayload, LandingAppOption } from "./default-company.types";
export function DefaultCompanyWorkspace({
  landingApps,
  onSaved
}: {
  landingApps: LandingAppOption[];
  onSaved?: () => void;
}) {
  const client = useQueryClient();
  const query = useDefaultCompany();
  const lookups = useDefaultCompanyLookups();
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: (payload: DefaultCompanySavePayload) => saveDefaultCompany(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: defaultCompanyQueryKey });
      toast.success("Default company saved", {
        description: `${record.companyName} · ${record.financialYearName}`
      });
      setEditing(false);
      onSaved?.();
    },
    onError: (error) =>
      toast.error("Unable to save default company", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });
  return (
    <WorkspacePage
      title="Default Company"
      description="Startup company and accounting year used across tenant workflows."
      technicalName="page.organisation.default-company"
      actions={
        <Button
          variant="outline"
          onClick={() => void Promise.all([query.refetch(), lookups.refetch()])}
        >
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <DefaultCompanyList record={query.data ?? null} onEdit={() => setEditing(true)} />
      <DefaultCompanyForm
        open={editing}
        record={query.data ?? null}
        companies={lookups.data?.companies ?? []}
        financialYears={lookups.data?.financialYears ?? []}
        landingApps={landingApps}
        loading={save.isPending}
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        onCancel={() => setEditing(false)}
        onSubmit={(payload) => save.mutate(payload)}
      />
    </WorkspacePage>
  );
}
