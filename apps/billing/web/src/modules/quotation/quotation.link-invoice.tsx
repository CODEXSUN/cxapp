import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@cxapp/ui/components/dialog";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspaceFormBanner } from "@cxapp/ui/workspace/upsert";
import {
  formatMoney,
  linkQuotationToExistingInvoice,
  listExistingQuotationInvoices
} from "./quotation.services";
import type { Quotation } from "./quotation.types";

export function QuotationLinkInvoice({
  quotation,
  disabled,
  onLinked
}: {
  quotation: Quotation;
  disabled: boolean;
  onLinked: (quotation: Quotation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const queryClient = useQueryClient();
  const candidates = useQuery({
    queryKey: ["billing", "quotations", quotation.id, "existing-invoices", search],
    queryFn: () => listExistingQuotationInvoices(quotation.id, search),
    enabled: open
  });
  const mutation = useMutation({
    mutationFn: () => linkQuotationToExistingInvoice(quotation.id, invoiceId),
    onSuccess: async (linked) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      setOpen(false);
      toast.success("Existing invoice linked", {
        description: `${linked.generatedSalesInvoiceNo}. Invoice contents are unchanged.`
      });
      onLinked(linked);
    }
  });
  return (
    <>
      <Button
        className="w-full"
        disabled={disabled}
        variant="outline"
        onClick={() => {
          setInvoiceId("");
          setSearch("");
          mutation.reset();
          setOpen(true);
        }}
      >
        <Link2 className="size-4" /> Link existing invoice
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link existing invoice</DialogTitle>
            <DialogDescription>
              Connect {quotation.quotationNumber} to an invoice for {quotation.customerName}. No
              items or amounts will change.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Invoice number <span className="text-destructive">*</span>
            <WorkspaceLookup
              allowTextValue={false}
              disabled={mutation.isPending}
              loading={candidates.isFetching}
              placeholder="Search invoice number"
              emptyLabel="No matching invoices. Try another invoice number."
              options={(candidates.data ?? []).map((invoice) => ({
                value: invoice.id,
                label: invoice.invoiceNumber,
                meta: formatMoney(invoice.amount)
              }))}
              value={invoiceId}
              onTextChange={setSearch}
              onValueChange={(value, option) => setInvoiceId(option ? value : "")}
            />
          </label>
          {candidates.isError || mutation.isError ? (
            <WorkspaceFormBanner title="Invoice could not be linked">
              {(mutation.error ?? candidates.error)?.message ?? "Invoice linking failed."}
            </WorkspaceFormBanner>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Only invoices in the same company, financial year, customer, and currency are available.
            Cancelled invoices are excluded.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!invoiceId || mutation.isPending || candidates.isError}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Linking…" : "Connect invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
