import { useEffect, useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@cxapp/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@cxapp/ui/components/select";
import { Textarea } from "@cxapp/ui/components/textarea";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { WorkspaceDatePicker } from "@cxapp/ui/workspace/date-picker";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspaceTablePanel } from "@cxapp/ui/workspace/table";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel
} from "@cxapp/ui/workspace/upsert";
import type {
  Account,
  AccountContext,
  BookAccount,
  BookEntryPayload,
  BookEntryType,
  CashBookContext,
  CashBookLedger,
  CashBookLedgerGroup,
  CashBookLedgerSavePayload
} from "./accounting.types";

type Draft = {
  accountId: string;
  amount: string;
  cashLedgerId: string;
  cashLines: Array<{ amount: string; id: string; ledgerId: string }>;
  counterpartAccountId: string;
  entryDate: string;
  entryNumber: string;
  notes: string;
  type: BookEntryType;
};

export function BookEntryForm({
  accounts,
  bookAccounts,
  cashBookContext,
  cashLedgers,
  cashLedgersLoading,
  creatingLedger,
  context,
  error,
  kind,
  ledgerGroups,
  onBack,
  onCreateLedger,
  onSave,
  saving
}: {
  accounts: Account[];
  bookAccounts: BookAccount[];
  cashBookContext: CashBookContext | null;
  cashLedgers: CashBookLedger[];
  cashLedgersLoading: boolean;
  creatingLedger: boolean;
  context: AccountContext | null;
  error?: string | undefined;
  kind: "cash" | "bank";
  ledgerGroups: CashBookLedgerGroup[];
  onBack: () => void;
  onCreateLedger: (payload: CashBookLedgerSavePayload) => Promise<CashBookLedger>;
  onSave: (payload: BookEntryPayload) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Draft>({
    accountId: "",
    amount: "",
    cashLedgerId: "",
    cashLines: [{ amount: "", id: "1", ledgerId: "" }],
    counterpartAccountId: "",
    entryDate: new Date().toISOString().slice(0, 10),
    entryNumber: cashBookContext?.suggestedEntryNumber ?? "",
    notes: "",
    type: "receipt"
  });
  const [validation, setValidation] = useState("");
  useEffect(() => {
    if (!cashBookContext?.suggestedEntryNumber) return;
    setDraft((current) =>
      current.entryNumber
        ? current
        : { ...current, entryNumber: cashBookContext.suggestedEntryNumber }
    );
  }, [cashBookContext?.suggestedEntryNumber]);
  const counterpartAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          !account.isGroup &&
          account.isPostable &&
          account.status === "active" &&
          account.id !== draft.accountId
      ),
    [accounts, draft.accountId]
  );
  const ledgerOptions = useMemo(
    () =>
      cashLedgers.map((ledger) => ({
        description: ledger.groupName,
        label: ledger.name,
        value: String(ledger.id)
      })),
    [cashLedgers]
  );

  function submit() {
    if (!context) return setValidation("Accounting context is not available.");
    const amount = Number(draft.amount);
    if (kind === "cash" && !draft.cashLedgerId)
      return setValidation("Select a cash ledger from Core Common Ledger.");
    if (kind === "cash" && draft.cashLines.some((line) => !line.ledgerId))
      return setValidation("Select a ledger for every cash entry row.");
    if (kind === "cash" && draft.cashLines.some((line) => line.ledgerId === draft.cashLedgerId))
      return setValidation("Cash and counterpart ledgers must be different.");
    if (
      kind === "cash" &&
      new Set(draft.cashLines.map((line) => line.ledgerId)).size !== draft.cashLines.length
    )
      return setValidation("Each counterpart ledger can be selected only once.");
    if (
      kind === "cash" &&
      draft.cashLines.some(
        (line) => !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0
      )
    )
      return setValidation("Enter an amount greater than zero for every cash entry row.");
    if (kind === "bank" && !draft.accountId) return setValidation("Select a bank account.");
    if (kind === "bank" && !draft.counterpartAccountId)
      return setValidation("Select a counterpart account.");
    if (kind === "bank" && (!Number.isFinite(amount) || amount <= 0))
      return setValidation("Enter an amount greater than zero.");
    if (!draft.entryDate) return setValidation("Entry date is required.");
    if (!draft.notes.trim()) return setValidation("Remarks / Notes are required.");
    setValidation("");
    onSave({
      amount,
      companyId: context.companyId,
      description: draft.notes.trim(),
      entryDate: draft.entryDate,
      ...(draft.entryNumber.trim() ? { entryNumber: draft.entryNumber.trim() } : {}),
      financialYearId: context.financialYearId,
      reference: draft.notes.trim(),
      type: draft.type,
      ...(kind === "cash"
        ? {
            cashLedgerId: Number(draft.cashLedgerId),
            cashLines: draft.cashLines.map((line) => ({
              amount: Number(line.amount),
              ledgerId: Number(line.ledgerId)
            }))
          }
        : {
            accountId: draft.accountId,
            counterpartAccountId: draft.counterpartAccountId
          })
    });
  }

  if (kind === "cash")
    return (
      <CashEntryForm
        draft={draft}
        error={validation || error}
        ledgerOptions={ledgerOptions}
        ledgerGroups={ledgerGroups}
        ledgersLoading={cashLedgersLoading}
        onBack={onBack}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onCreateLedger={onCreateLedger}
        onSubmit={submit}
        rowPosition={cashBookContext?.rowPosition ?? null}
        saving={saving}
        creatingLedger={creatingLedger}
      />
    );

  return (
    <BankEntryForm
      bookAccounts={bookAccounts}
      counterpartAccounts={counterpartAccounts}
      draft={draft}
      error={validation || error}
      onBack={onBack}
      onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      onSubmit={submit}
      saving={saving}
    />
  );
}

function CashEntryForm({
  draft,
  error,
  ledgerOptions,
  ledgerGroups,
  ledgersLoading,
  onBack,
  onChange,
  onCreateLedger,
  onSubmit,
  rowPosition,
  saving,
  creatingLedger
}: {
  draft: Draft;
  error?: string | undefined;
  ledgerOptions: Array<{ description: string; label: string; value: string }>;
  ledgerGroups: CashBookLedgerGroup[];
  ledgersLoading: boolean;
  onBack: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onCreateLedger: (payload: CashBookLedgerSavePayload) => Promise<CashBookLedger>;
  onSubmit: () => void;
  rowPosition: number | null;
  saving: boolean;
  creatingLedger: boolean;
}) {
  const cashIn = draft.type === "receipt";
  const total = draft.cashLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const cashRow = {
    kind: "cash" as const,
    prefix: cashIn ? "By" : "To",
    side: cashIn ? ("debit" as const) : ("credit" as const)
  };
  const counterpartRows = draft.cashLines.map((line) => ({
    kind: "counterpart" as const,
    line,
    prefix: cashIn ? "To" : "By",
    side: cashIn ? ("credit" as const) : ("debit" as const)
  }));
  const rows = cashIn ? [cashRow, ...counterpartRows] : [...counterpartRows, cashRow];

  function patchCashLine(id: string, patch: { amount?: string; ledgerId?: string }) {
    onChange({
      cashLines: draft.cashLines.map((line) => (line.id === id ? { ...line, ...patch } : line))
    });
  }
  return (
    <WorkspacePage
      description="Create a balanced Tally-style cash voucher."
      onBack={onBack}
      title="New cash entry"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <WorkspaceFormPanel
          footer={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <WorkspaceFormActions className="border-0 bg-transparent p-0 shadow-none">
                <Button disabled={saving} type="submit">
                  <Save className="size-4" />
                  {saving ? "Posting..." : "Save and post"}
                </Button>
                <Button onClick={onBack} type="button" variant="outline">
                  <X className="size-4" />
                  Cancel
                </Button>
              </WorkspaceFormActions>
              <div className="grid w-28 gap-1.5">
                <Label className="text-xs text-muted-foreground">Row position</Label>
                <Input
                  aria-label="Row position"
                  className="h-9 text-center"
                  readOnly
                  value={rowPosition ?? ""}
                />
              </div>
            </div>
          }
        >
          {error ? (
            <WorkspaceFormBanner title="Cash entry could not be posted">
              {error}
            </WorkspaceFormBanner>
          ) : null}
          <div className="space-y-6">
            <section>
              <WorkspaceFormGrid>
                <WorkspaceFormField className="md:col-span-2" label="Entry type" required>
                  <EntryTypeRadio cashLabels draft={draft} onChange={onChange} />
                </WorkspaceFormField>
                <WorkspaceFormField label="Date" required>
                  <WorkspaceDatePicker
                    required
                    value={draft.entryDate}
                    onValueChange={(value) => onChange({ entryDate: value })}
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="Entry number">
                  <Input
                    onChange={(event) => onChange({ entryNumber: event.target.value })}
                    placeholder="Generated automatically"
                    value={draft.entryNumber}
                  />
                </WorkspaceFormField>
              </WorkspaceFormGrid>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-foreground">Double entry</h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-20 border-b px-4 py-3 text-left">By / To</th>
                      <th className="border-b px-4 py-3 text-left">Ledger Name</th>
                      <th className="w-44 border-b px-4 py-3 text-right">Dr</th>
                      <th className="w-44 border-b px-4 py-3 text-right">Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const value = row.kind === "cash" ? draft.cashLedgerId : row.line.ledgerId;
                      return (
                        <tr
                          className="border-b last:border-0"
                          key={row.kind === "cash" ? "cash" : row.line.id}
                        >
                          <td className="px-4 py-3 text-base font-semibold">
                            <div className="flex items-center gap-2">
                              <span>{row.prefix}</span>
                              {row.kind === "counterpart" && draft.cashLines.length > 1 ? (
                                <button
                                  aria-label="Remove row"
                                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() =>
                                    onChange({
                                      cashLines: draft.cashLines.filter(
                                        (line) => line.id !== row.line.id
                                      )
                                    })
                                  }
                                  type="button"
                                >
                                  <X className="size-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <WorkspaceLookup
                              allowTextValue={false}
                              createLabel="Create ledger"
                              createMode="popup"
                              createTitle="New ledger"
                              loading={ledgersLoading}
                              options={ledgerOptions}
                              placeholder={
                                row.kind === "cash" ? "Search cash ledger" : "Search ledger"
                              }
                              required
                              showAllOptionsOnFocus
                              value={value}
                              renderCreateForm={({ initialName, onCancel, onCreated }) => (
                                <CashLedgerCreateForm
                                  groups={ledgerGroups}
                                  initialName={initialName}
                                  saving={creatingLedger}
                                  onCancel={onCancel}
                                  onSave={async (payload) => {
                                    const created = await onCreateLedger(payload);
                                    onCreated({
                                      description: created.groupName,
                                      label: created.name,
                                      value: String(created.id)
                                    });
                                  }}
                                />
                              )}
                              onValueChange={(next) =>
                                onChange(
                                  row.kind === "cash"
                                    ? { cashLedgerId: next }
                                    : {
                                        cashLines: draft.cashLines.map((line) =>
                                          line.id === row.line.id
                                            ? { ...line, ledgerId: next }
                                            : line
                                        )
                                      }
                                )
                              }
                            />
                          </td>
                          <AmountCell
                            active={row.side === "debit"}
                            amount={row.kind === "cash" ? String(total || "") : row.line.amount}
                            readOnly={row.kind === "cash"}
                            onChange={(amount) =>
                              row.kind === "counterpart" && patchCashLine(row.line.id, { amount })
                            }
                          />
                          <AmountCell
                            active={row.side === "credit"}
                            amount={row.kind === "cash" ? String(total || "") : row.line.amount}
                            readOnly={row.kind === "cash"}
                            onChange={(amount) =>
                              row.kind === "counterpart" && patchCashLine(row.line.id, { amount })
                            }
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/20 font-semibold">
                    <tr>
                      <td className="border-t px-4 py-3" colSpan={2}>
                        <div className="flex items-center gap-3">
                          <Button
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              onChange({
                                cashLines: [
                                  ...draft.cashLines,
                                  { amount: "", id: `${Date.now()}`, ledgerId: "" }
                                ]
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Plus className="size-3.5" />
                            Add row
                          </Button>
                          <span>Total</span>
                        </div>
                      </td>
                      <td className="border-t px-4 py-3 text-right">
                        {displayAmount(String(total))}
                      </td>
                      <td className="border-t px-4 py-3 text-right">
                        {displayAmount(String(total))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section>
              <WorkspaceFormField label="Remarks / Notes" required>
                <Textarea
                  onChange={(event) => onChange({ notes: event.target.value })}
                  placeholder="Enter voucher remarks or notes"
                  rows={3}
                  value={draft.notes}
                />
              </WorkspaceFormField>
            </section>
          </div>
        </WorkspaceFormPanel>
      </form>
    </WorkspacePage>
  );
}

function CashLedgerCreateForm({
  groups,
  initialName,
  onCancel,
  onSave,
  saving
}: {
  groups: CashBookLedgerGroup[];
  initialName: string;
  onCancel: () => void;
  onSave: (payload: CashBookLedgerSavePayload) => Promise<void>;
  saving: boolean;
}) {
  const activeGroups = groups.filter((group) => group.status === "active");
  const [ledgerGroupId, setLedgerGroupId] = useState(activeGroups[0]?.id ?? 0);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!name.trim()) return setError("Ledger name is required.");
        if (!ledgerGroupId) return setError("Select a ledger group.");
        setError("");
        void onSave({ ledgerGroupId, name: name.trim(), status: "active" }).catch(
          (reason: unknown) =>
            setError(reason instanceof Error ? reason.message : "Ledger could not be created.")
        );
      }}
    >
      <DialogHeader className="border-b px-5 py-4 pr-12">
        <DialogTitle>New ledger</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 p-5">
        {error ? (
          <WorkspaceFormBanner title="Ledger could not be created">{error}</WorkspaceFormBanner>
        ) : null}
        <WorkspaceFormGrid columns={1}>
          <WorkspaceFormField label="Ledger group" required>
            <WorkspaceLookup
              allowTextValue={false}
              options={activeGroups.map((group) => ({
                label: group.name,
                value: String(group.id)
              }))}
              placeholder="Search ledger group"
              showAllOptionsOnFocus
              value={ledgerGroupId ? String(ledgerGroupId) : ""}
              onValueChange={(value) => setLedgerGroupId(Number(value) || 0)}
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Ledger name" required>
            <Input
              autoFocus
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </WorkspaceFormField>
        </WorkspaceFormGrid>
      </div>
      <DialogFooter className="border-t px-5 py-4">
        <Button disabled={saving} onClick={onCancel} type="button" variant="outline">
          <X className="size-4" /> Cancel
        </Button>
        <Button disabled={saving || !name.trim() || !ledgerGroupId} type="submit">
          <Save className="size-4" /> {saving ? "Saving..." : "Save ledger"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AmountCell({
  active,
  amount,
  onChange,
  readOnly = false
}: {
  active: boolean;
  amount: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <td className="px-4 py-3">
      {active ? (
        <Input
          className="text-right"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          readOnly={readOnly}
          type="text"
          value={amount}
        />
      ) : (
        <div className="px-3 text-right text-muted-foreground">—</div>
      )}
    </td>
  );
}

function BankEntryForm({
  bookAccounts,
  counterpartAccounts,
  draft,
  error,
  onBack,
  onChange,
  onSubmit,
  saving
}: {
  bookAccounts: BookAccount[];
  counterpartAccounts: Account[];
  draft: Draft;
  error?: string | undefined;
  onBack: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <WorkspacePage
      description="Record a balanced bank receipt or payment."
      onBack={onBack}
      title="New bank entry"
    >
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <WorkspaceTablePanel>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Entry type">
            <EntryTypeRadio draft={draft} onChange={onChange} />
          </Field>
          <Field label="Bank account">
            <Select onValueChange={(accountId) => onChange({ accountId })} value={draft.accountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {bookAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Counterpart account">
            <Select
              onValueChange={(counterpartAccountId) => onChange({ counterpartAccountId })}
              value={draft.counterpartAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {counterpartAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              inputMode="decimal"
              min="0"
              onChange={(event) => onChange({ amount: event.target.value })}
              placeholder="0.00"
              type="number"
              value={draft.amount}
            />
          </Field>
          <Field label="Date">
            <Input
              onChange={(event) => onChange({ entryDate: event.target.value })}
              type="date"
              value={draft.entryDate}
            />
          </Field>
          <Field label="Entry number">
            <Input
              onChange={(event) => onChange({ entryNumber: event.target.value })}
              placeholder="Generated automatically"
              value={draft.entryNumber}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Remarks / Notes">
              <Textarea
                onChange={(event) => onChange({ notes: event.target.value })}
                placeholder="Enter voucher remarks or notes"
                rows={3}
                value={draft.notes}
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button onClick={onBack} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={saving} onClick={onSubmit} type="button">
            {saving ? "Posting…" : "Save and post"}
          </Button>
        </div>
      </WorkspaceTablePanel>
    </WorkspacePage>
  );
}

function EntryTypeRadio({
  cashLabels = false,
  draft,
  onChange
}: {
  cashLabels?: boolean;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const options = cashLabels
    ? [
        { description: "Receipt", label: "Cash In", value: "receipt" as const },
        { description: "Payment", label: "Cash Out", value: "payment" as const }
      ]
    : [
        { description: "Receipt", label: "Money in", value: "receipt" as const },
        { description: "Payment", label: "Money out", value: "payment" as const }
      ];
  return (
    <RadioGroup
      aria-label="Entry type"
      className="grid grid-cols-2 gap-3"
      onValueChange={(type) => onChange({ type: type as BookEntryType })}
      value={draft.type}
    >
      {options.map((option) => {
        const selected = draft.type === option.value;
        return (
          <Label
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
              selected ? "border-primary/60 bg-primary/5" : "bg-background hover:bg-muted/35"
            }`}
            key={option.value}
          >
            <RadioGroupItem value={option.value} />
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {option.description}
              </span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function displayAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : "0.00";
}
