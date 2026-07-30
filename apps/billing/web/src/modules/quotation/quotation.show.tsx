import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Send,
  Settings2,
  Tag,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@codexsun/ui/components/card";
import { Input } from "@codexsun/ui/components/input";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { cn } from "@codexsun/ui/lib/utils";
import { queueBillingDocumentEmail } from "@codexsun/mail-web/modules/mail";
import { getTenantUserLabel } from "../../shared/api/tenant-context";
import { formatDate } from "./quotation.services";
import { QuotationPrintDocument, type QuotationPrintCopy } from "./quotation.print";
import type { Quotation } from "./quotation.types";

const printCopyOptions: Array<{ label: string; value: QuotationPrintCopy }> = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "office-copy" }
];

type QuotationEntryToolId =
  "assign" | "attachments" | "downloadPdf" | "email" | "tags" | "whatsapp";

export function QuotationShowPage({
  canEdit = true,
  converting,
  onBack,
  onConvert,
  onEdit,
  onNew,
  onNext,
  onPrevious,
  onPrint,
  onSuspend,
  quotation
}: {
  canEdit?: boolean;
  converting: boolean;
  onBack: () => void;
  onConvert: () => void;
  onEdit: () => void;
  onNew: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPrint: () => void;
  onSuspend: () => void;
  quotation: Quotation;
}) {
  const activityUser = getTenantUserLabel();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Array<{ body: string; createdAt: string; id: string }>>(
    []
  );
  const [openTool, setOpenTool] = useState<QuotationEntryToolId | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [toolActivities, setToolActivities] = useState<
    Array<{ id: string; message: string; createdAt: string }>
  >([]);
  const [printCopies, setPrintCopies] = useState<readonly QuotationPrintCopy[]>(["original"]);

  const entryTools: Array<{ icon: typeof Mail; id: QuotationEntryToolId; label: string }> = [
    { icon: Download, id: "downloadPdf", label: "Download PDF" },
    { icon: Mail, id: "email", label: "Send to Email" },
    { icon: UserRound, id: "assign", label: "Assign" },
    { icon: Paperclip, id: "attachments", label: "Attachments" },
    { icon: Tag, id: "tags", label: "Tags" },
    { icon: MessageCircle, id: "whatsapp", label: "Send to WhatsApp" }
  ];

  const activityItems = useMemo(
    () =>
      [
        ...toolActivities,
        {
          createdAt: quotation.updatedAt,
          id: "updated",
          message: `Quotation updated${quotation.generatedSalesInvoiceNo ? ` and linked to ${quotation.generatedSalesInvoiceNo}` : ""}`
        },
        { createdAt: quotation.createdAt, id: "created", message: "Quotation entry created" }
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [quotation.createdAt, quotation.generatedSalesInvoiceNo, quotation.updatedAt, toolActivities]
  );

  function togglePrintCopy(copy: QuotationPrintCopy) {
    setPrintCopies((current) => {
      if (!current.includes(copy)) return [...current, copy];
      if (current.length === 1) return current;
      return current.filter((value) => value !== copy);
    });
  }

  function recordActivity(message: string) {
    setToolActivities((current) => [
      { createdAt: new Date().toISOString(), id: `${Date.now()}-${current.length}`, message },
      ...current
    ]);
  }

  function addComment() {
    const body = comment.trim();
    if (!body) return;
    setComments((current) => [
      { body, createdAt: new Date().toISOString(), id: `${Date.now()}-${current.length}` },
      ...current
    ]);
    recordActivity("Added a comment");
    setComment("");
  }

  function addListValue(
    value: string,
    setValue: (value: string) => void,
    setValues: React.Dispatch<React.SetStateAction<string[]>>,
    message: (value: string) => string
  ) {
    const next = value.trim();
    if (!next) return;
    setValues((current) => (current.includes(next) ? current : [...current, next]));
    recordActivity(message(next));
    setValue("");
  }

  function removeListValue(
    value: string,
    setValues: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setValues((current) => current.filter((item) => item !== value));
  }

  return (
    <WorkspacePage
      className="billing-document-print-page max-w-[100rem]"
      title={quotation.customerName}
      description={quotation.quotationNumber}
      actions={
        <Button type="button" className="h-9 rounded-md" onClick={onNew}>
          <Plus className="size-4" />
          New
        </Button>
      }
    >
      <main className="mx-auto w-full pb-8">
        <div className="mb-4 grid gap-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="order-2 flex shrink-0 flex-wrap items-center gap-2 sm:order-1">
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                disabled={!onPrevious}
                onClick={onPrevious}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                disabled={!onNext}
                onClick={onNext}
              >
                <ChevronRight className="size-4" />
                Next
              </Button>
            </div>
            <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2">
              <Button className="rounded-xl" onClick={onPrint} type="button">
                <Printer className="size-4" />
                Print
              </Button>
              <Button
                disabled={!canEdit}
                title={canEdit ? "Edit quotation" : "Submitted quotations cannot be edited"}
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={onEdit}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              {quotation.status !== "cancelled" ? (
                <Button
                  onClick={onSuspend}
                  type="button"
                  variant="destructive"
                  className="rounded-xl"
                >
                  <Trash2 className="size-4" />
                  Suspend
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <section className="billing-print-area grid items-start gap-4 py-2 print:block print:py-0 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="billing-mail-document min-w-0 overflow-x-auto">
            <div className="grid min-w-fit justify-center gap-6">
              {printCopies.map((copy) => (
                <div key={copy}>
                  <QuotationPrintDocument copy={copy} quotation={quotation} />
                </div>
              ))}
            </div>
          </div>
          <div className="h-fit space-y-3 pt-4 xl:sticky xl:top-4">
            {!quotation.generatedSalesInvoiceNo && quotation.status !== "cancelled" ? (
              <Button
                disabled={converting}
                type="button"
                className="h-11 w-full rounded-xl px-5 text-base font-semibold shadow-sm"
                onClick={onConvert}
              >
                <Send className="size-4" />
                Convert to sale
              </Button>
            ) : null}
            <Card className="rounded-md border-border/70 shadow-sm print:hidden">
              <CardHeader className="border-b border-border/70 px-4 py-3">
                <CardTitle className="text-sm">Print copies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {printCopyOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={printCopies.includes(option.value)}
                      onChange={() => togglePrintCopy(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="mt-4 grid gap-4 print:hidden xl:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="min-h-[350px] rounded-md border-border/70 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  A
                </div>
                <Input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Type a reply / comment"
                  className="h-10 rounded-md shadow-sm"
                />
                <Button
                  disabled={!comment.trim()}
                  onClick={addComment}
                  type="button"
                  className="h-10 rounded-md px-4"
                >
                  Add
                </Button>
              </div>
              {comments.length || quotation.notes ? (
                <div className="space-y-2">
                  {quotation.notes ? (
                    <SideNote body={quotation.notes} meta="Saved notes" title="System" />
                  ) : null}
                  {comments.map((item) => (
                    <SideNote
                      key={item.id}
                      body={item.body}
                      meta={formatDateTime(item.createdAt)}
                      title="Admin"
                      titleOnRight
                    />
                  ))}
                </div>
              ) : null}
              <div>
                <h2 className="mb-5 text-lg font-semibold">Activity</h2>
                <div className="relative space-y-5 before:absolute before:left-[6px] before:top-1 before:h-[calc(100%-0.25rem)] before:border-l-2 before:border-border">
                  {activityItems.map((item) => (
                    <div key={item.id} className="relative pl-9 text-sm">
                      <span className="absolute left-0 top-0.5 flex size-3.5 items-center justify-center rounded-full border border-muted-foreground/10 bg-muted-foreground/10 shadow-sm">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                      </span>
                      <span>{item.message}</span>
                      <span className="text-muted-foreground">
                        {` · ${formatDate(item.createdAt)} - by ${activityUser}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-md border-border/70 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-3 py-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="size-4" />
                Entry tools
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 [&:last-child]:pb-0">
              {entryTools.map((tool) => (
                <div key={tool.id} className="border-b border-border/70 last:border-b-0">
                  <button
                    onClick={() => {
                      if (tool.id === "downloadPdf") {
                        recordActivity(`Downloaded print preview for ${quotation.quotationNumber}`);
                        toast.success("Print preview download queued");
                        return;
                      }
                      setOpenTool((current) => (current === tool.id ? null : tool.id));
                    }}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    <tool.icon className="size-4" />
                    <span className="flex-1">{tool.label}</span>
                    <Plus
                      className={cn(
                        "size-4 transition-transform",
                        openTool === tool.id ? "rotate-45" : ""
                      )}
                    />
                  </button>
                  {tool.id === "assign" && assignees.length ? (
                    <div className="px-3 pb-2">
                      <ToolPills
                        values={assignees}
                        onRemove={(value) => removeListValue(value, setAssignees)}
                      />
                    </div>
                  ) : null}
                  {tool.id === "attachments" && attachments.length ? (
                    <div className="px-3 pb-2">
                      <ToolPills
                        values={attachments}
                        onRemove={(value) => removeListValue(value, setAttachments)}
                      />
                    </div>
                  ) : null}
                  {tool.id === "tags" && tags.length ? (
                    <div className="px-3 pb-2">
                      <ToolPills
                        values={tags}
                        onRemove={(value) => removeListValue(value, setTags)}
                      />
                    </div>
                  ) : null}
                  {openTool === tool.id ? (
                    <div className="px-3 pb-3">
                      {tool.id === "email" ? (
                        <InlineSend
                          value={emailAddress}
                          placeholder="Email address"
                          onChange={setEmailAddress}
                          onSend={async () => {
                            const value = emailAddress.trim();
                            if (!value) return;
                            const documentElement =
                              document.querySelector<HTMLElement>(".billing-mail-document");
                            if (!documentElement)
                              return toast.error("Quotation preview is not ready.");
                            try {
                              await queueBillingDocumentEmail({
                                documentElement,
                                documentNumber: quotation.quotationNumber,
                                documentTitle: "Quotation",
                                partyName: quotation.customerName,
                                recipient: value
                              });
                              recordActivity(`Queued quotation email to ${value}`);
                              toast.success("Quotation email queued");
                              setEmailAddress("");
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Quotation email failed."
                              );
                            }
                          }}
                        />
                      ) : null}
                      {tool.id === "assign" ? (
                        <Input
                          value={assigneeInput}
                          onChange={(event) => setAssigneeInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addListValue(
                                assigneeInput,
                                setAssigneeInput,
                                setAssignees,
                                (value) => `Assigned quotation to ${value}`
                              );
                            }
                          }}
                          placeholder="User name or email"
                          className="h-9 rounded-md"
                        />
                      ) : null}
                      {tool.id === "attachments" ? (
                        <Input
                          type="file"
                          multiple
                          className="h-9 rounded-md"
                          onChange={(event) => {
                            const names = Array.from(event.target.files ?? []).map(
                              (file) => file.name
                            );
                            if (names.length) {
                              setAttachments((current) => [
                                ...current,
                                ...names.filter((name) => !current.includes(name))
                              ]);
                              names.forEach((name) => recordActivity(`Attached file ${name}`));
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      ) : null}
                      {tool.id === "tags" ? (
                        <Input
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addListValue(
                                tagInput,
                                setTagInput,
                                setTags,
                                (value) => `Added tag ${value}`
                              );
                            }
                          }}
                          placeholder="Tag"
                          className="h-9 rounded-md"
                        />
                      ) : null}
                      {tool.id === "whatsapp" ? (
                        <InlineSend
                          value={whatsappNumber}
                          placeholder="WhatsApp number"
                          onChange={setWhatsappNumber}
                          onSend={() => {
                            const value = whatsappNumber.trim();
                            if (!value) return;
                            recordActivity(`Sent WhatsApp message to ${value}`);
                            setWhatsappNumber("");
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </WorkspacePage>
  );
}

function InlineSend({
  onChange,
  onSend,
  placeholder,
  value
}: {
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md"
      />
      <Button
        disabled={!value.trim()}
        onClick={onSend}
        type="button"
        className="size-9 rounded-md p-0"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}

function SideNote({
  body,
  meta,
  title,
  titleOnRight = false
}: {
  body: string;
  meta: string;
  title: string;
  titleOnRight?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        {titleOnRight ? (
          <>
            <span className="text-xs text-muted-foreground">{meta}</span>
            <span className="font-medium">{title}</span>
          </>
        ) : (
          <>
            <span className="font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">{meta}</span>
          </>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function ToolPills({
  onRemove,
  values
}: {
  onRemove(value: string): void;
  values: readonly string[];
}) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs font-medium text-foreground"
        >
          <span className="truncate">{value}</span>
          <button
            aria-label={`Remove ${value}`}
            className="rounded-sm text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(value)}
            type="button"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
