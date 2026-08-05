import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
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
import { Button } from "@cxapp/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@cxapp/ui/components/card";
import { Input } from "@cxapp/ui/components/input";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { cn } from "@cxapp/ui/lib/utils";
import { queueBillingDocumentEmail } from "@cxapp/mail-web/modules/mail";
import { getTenantUserLabel } from "../../shared/api/tenant-context";
import {
  buildAndQueueBillingDocumentPdf,
  downloadBillingDocumentPdf,
  openBillingDocumentWhatsApp,
  requireBillingDocumentElement,
  reserveBillingDocumentWhatsAppPage
} from "../../shared/entry-tools";
import { useBillingDocumentTitle } from "../settings";
import { formatDate } from "./sales.services";
import { SalePrintDocument, type SalePrintCopy } from "./sales.print";
import type { Sale } from "./sales.types";

const printCopyOptions: Array<{ label: string; value: SalePrintCopy }> = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "office-copy" }
];

type SaleEntryToolId = "assign" | "attachments" | "downloadPdf" | "email" | "tags" | "whatsapp";

export function SaleShowPage({
  canEdit = true,
  onBack,
  onEdit,
  onNew,
  onNext,
  onPrevious,
  onPrint,
  onSuspend,
  sale
}: {
  canEdit?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onNew: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPrint: () => void;
  onSuspend: () => void;
  sale: Sale;
}) {
  const documentTitle = useBillingDocumentTitle("sales");
  const activityUser = getTenantUserLabel();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Array<{ body: string; createdAt: string; id: string }>>(
    []
  );
  const [openTool, setOpenTool] = useState<SaleEntryToolId | null>(null);
  const [emailAddress, setEmailAddress] = useState(sale.customerEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(sale.customerPhone);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [toolActivities, setToolActivities] = useState<
    Array<{ id: string; message: string; createdAt: string }>
  >([]);
  const [printCopies, setPrintCopies] = useState<readonly SalePrintCopy[]>(["original"]);
  const [processingTool, setProcessingTool] = useState<"downloadPdf" | "email" | "whatsapp" | null>(
    null
  );

  useEffect(() => {
    setEmailAddress(sale.customerEmail);
    setWhatsappNumber(sale.customerPhone);
  }, [sale.customerEmail, sale.customerPhone, sale.id]);

  const entryTools: Array<{ icon: typeof Mail; id: SaleEntryToolId; label: string }> = [
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
          createdAt: sale.updatedAt,
          id: "updated",
          message: `Sale updated${sale.generatedSalesInvoiceNo ? ` and linked to ${sale.generatedSalesInvoiceNo}` : ""}`
        },
        { createdAt: sale.createdAt, id: "created", message: "Sale entry created" }
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [sale.createdAt, sale.generatedSalesInvoiceNo, sale.updatedAt, toolActivities]
  );

  function togglePrintCopy(copy: SalePrintCopy) {
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

  async function buildQueuedPdf() {
    return buildAndQueueBillingDocumentPdf({
      documentElement: requireBillingDocumentElement(),
      documentKind: "sales",
      documentNumber: sale.saleNumber,
      documentTitle
    });
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
      title={sale.customerName}
      description={sale.saleNumber}
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
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button className="rounded-xl" onClick={onPrint} type="button">
                <Printer className="size-4" />
                Print
              </Button>
              <Button
                disabled={!canEdit}
                title={canEdit ? "Edit sale" : "Submitted sales cannot be edited"}
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={onEdit}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              {sale.status !== "cancelled" ? (
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
                  <SalePrintDocument copy={copy} sale={sale} />
                </div>
              ))}
            </div>
          </div>
          <Card className="h-fit rounded-md border-border/70 shadow-sm print:hidden xl:sticky xl:top-4 xl:mt-4">
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
        </section>

        <div className="mt-4 grid gap-4 print:hidden xl:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="min-h-[350px] rounded-md border-border/70 shadow-none">
            <CardHeader className="px-6 pb-3 pt-5">
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-5 pt-0">
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
              {comments.length || sale.notes ? (
                <div className="space-y-1.5">
                  {sale.notes ? (
                    <SideNote body={sale.notes} meta="Saved notes" title="System" />
                  ) : null}
                  {comments.map((item) => (
                    <SideNote
                      key={item.id}
                      body={item.body}
                      meta={formatDateTime(item.createdAt)}
                      title="Admin"
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
                        {` @ ${formatDate(item.createdAt)} - by ${activityUser}`}
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
                    disabled={processingTool !== null}
                    onClick={async () => {
                      if (tool.id === "downloadPdf") {
                        setProcessingTool("downloadPdf");
                        try {
                          const result = await buildQueuedPdf();
                          downloadBillingDocumentPdf(result.attachment);
                          recordActivity(
                            `Downloaded PDF for ${sale.saleNumber} (queue #${result.job.jobId})`
                          );
                          toast.success("Invoice PDF downloaded", {
                            description: `Queue job #${result.job.jobId} was accepted for tracking.`
                          });
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Invoice PDF download failed."
                          );
                        } finally {
                          setProcessingTool(null);
                        }
                        return;
                      }
                      setOpenTool((current) => (current === tool.id ? null : tool.id));
                    }}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    {tool.id === "downloadPdf" && processingTool === "downloadPdf" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <tool.icon className="size-4" />
                    )}
                    <span className="flex-1">{tool.label}</span>
                    {tool.id !== "downloadPdf" ? (
                      <Plus
                        className={cn(
                          "size-4 transition-transform",
                          openTool === tool.id ? "rotate-45" : ""
                        )}
                      />
                    ) : null}
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
                          loading={processingTool === "email"}
                          value={emailAddress}
                          placeholder="Email address"
                          onChange={setEmailAddress}
                          onSend={async () => {
                            const value = emailAddress.trim();
                            if (!value) return;
                            setProcessingTool("email");
                            try {
                              await queueBillingDocumentEmail({
                                documentElement: requireBillingDocumentElement(),
                                documentNumber: sale.saleNumber,
                                documentTitle,
                                partyName: sale.customerName,
                                recipient: value
                              });
                              recordActivity(`Queued sale email to ${value}`);
                              toast.success("Invoice email queued", {
                                description:
                                  "The request is queued and can be tracked while you continue working."
                              });
                              setEmailAddress("");
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Invoice email failed.",
                                {
                                  description:
                                    "Review the details, correct the problem, and try again."
                                }
                              );
                            } finally {
                              setProcessingTool(null);
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
                                (value) => `Assigned sale to ${value}`
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
                          loading={processingTool === "whatsapp"}
                          value={whatsappNumber}
                          placeholder="WhatsApp number"
                          onChange={setWhatsappNumber}
                          onSend={async () => {
                            const value = whatsappNumber.trim();
                            if (!value) return;
                            let page: Window | null = null;
                            setProcessingTool("whatsapp");
                            try {
                              page = reserveBillingDocumentWhatsAppPage();
                              const result = await buildQueuedPdf();
                              downloadBillingDocumentPdf(result.attachment);
                              const phone = openBillingDocumentWhatsApp(page, {
                                documentNumber: sale.saleNumber,
                                documentTitle,
                                partyName: sale.customerName,
                                phone: value
                              });
                              recordActivity(
                                `Opened WhatsApp for ${phone} with PDF queue #${result.job.jobId}`
                              );
                              toast.success("PDF downloaded and WhatsApp opened", {
                                description:
                                  "Attach the downloaded PDF, review the message, and press Send."
                              });
                              setWhatsappNumber("");
                            } catch (error) {
                              page?.close();
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "WhatsApp document preparation failed."
                              );
                            } finally {
                              setProcessingTool(null);
                            }
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

export const SalesShowPage = SaleShowPage;

function InlineSend({
  loading = false,
  onChange,
  onSend,
  placeholder,
  value
}: {
  loading?: boolean;
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
        disabled={loading || !value.trim()}
        onClick={onSend}
        type="button"
        className="size-9 rounded-md p-0"
      >
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
      </Button>
    </div>
  );
}

function SideNote({ body, meta, title }: { body: string; meta: string; title: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md border border-border/70 bg-muted/10 px-3 py-2">
      <p className="min-w-0 whitespace-pre-wrap text-sm leading-5 text-foreground">{body}</p>
      <div className="flex shrink-0 flex-col items-end text-right leading-tight">
        <span className="text-xs text-muted-foreground">{meta}</span>
        <span className="mt-0.5 text-sm font-medium">{title}</span>
      </div>
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
