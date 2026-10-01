import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { useBillingAccess } from "../../shared/auth/billing-access";
import { useOpeningBalances } from "./opening-balance.hooks";
import { OpeningBalanceForm } from "./opening-balance.form";
import { OpeningBalanceList } from "./opening-balance.list";
import { saveOpeningBalance } from "./opening-balance.services";
import type { OpeningBalanceInput } from "./opening-balance.types";

export function OpeningBalanceWorkspace() {
  const query = useOpeningBalances();
  const access = useBillingAccess();
  const client = useQueryClient();
  const [form, setForm] = useState<{ initial: OpeningBalanceInput | null } | null>(null);
  const mutation = useMutation({
    mutationFn: saveOpeningBalance,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["billing"] });
      setForm(null);
      toast.success("Opening balance saved");
    }
  });
  if (query.isLoading) return <p>Loading opening balances…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Openings belong to the selected company and financial year. Review legacy values before
        assignment.
      </p>
      {form ? (
        <OpeningBalanceForm
          data={query.data}
          initial={form.initial}
          saving={mutation.isPending}
          error={mutation.error?.message ?? ""}
          onSave={(value) => mutation.mutate(value)}
          onCancel={() => setForm(null)}
        />
      ) : (
        <>
          <Button
            disabled={!access.data?.canEditEntries}
            onClick={() => {
              mutation.reset();
              setForm({ initial: null });
            }}
          >
            New opening
          </Button>
          <OpeningBalanceList
            items={query.data.items}
            canEdit={Boolean(access.data?.canEditEntries)}
            onEdit={(item) => {
              mutation.reset();
              setForm({ initial: item });
            }}
          />
        </>
      )}
    </div>
  );
}
