import { useState } from "react";
import { Bold, FileText, Italic, Paperclip, Send, Underline } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Textarea } from "@codexsun/ui/components/textarea";
import { mailComposeSchema } from "./mail.schema";
import type { MailComposePayload } from "./mail.types";

type PendingAttachment = MailComposePayload["attachments"][number];

export function MailComposeForm({
  busy,
  onOpenChange,
  onSubmit,
  open,
  preset
}: {
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MailComposePayload) => Promise<void>;
  open: boolean;
  preset?: Partial<Pick<MailComposePayload, "subject" | "to">>;
}) {
  const [to, setTo] = useState(preset?.to?.join(", ") ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(preset?.subject ?? "");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState("");

  async function submit(saveAsDraft: boolean) {
    const payload = {
      attachments,
      bcc: addresses(bcc),
      bodyHtml: richHtml(body),
      bodyText: body,
      cc: addresses(cc),
      saveAsDraft,
      scheduledAt: null,
      subject,
      to: addresses(to)
    } satisfies MailComposePayload;
    const parsed = mailComposeSchema.safeParse(payload);
    if (!saveAsDraft && !parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the message fields.");
      return;
    }
    if (saveAsDraft && !subject.trim()) {
      setError("Subject is required before saving a draft.");
      return;
    }
    setError("");
    await onSubmit(payload);
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setAttachments([]);
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const next = await Promise.all(
      Array.from(files)
        .slice(0, 10)
        .map(async (file) => ({
          base64: await dataUrl(file),
          fileName: file.name,
          mimeType: file.type || "application/octet-stream"
        }))
    );
    setAttachments((current) => [...current, ...next].slice(0, 10));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Compose a rich tenant mail with optional PDF or file attachments.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 overflow-y-auto p-5">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="To (comma separated)"
            aria-label="To"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Cc"
              aria-label="Cc"
            />
            <Input
              value={bcc}
              onChange={(event) => setBcc(event.target.value)}
              placeholder="Bcc"
              aria-label="Bcc"
            />
          </div>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject"
            aria-label="Subject"
          />
          <div className="overflow-hidden rounded-md border bg-background">
            <div className="flex items-center gap-1 border-b bg-muted/30 p-1.5">
              {[Bold, Italic, Underline].map((Icon, index) => (
                <Button
                  key={index}
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() =>
                    setBody(
                      (value) =>
                        `${value}${index === 0 ? "**bold**" : index === 1 ? "_italic_" : "__underline__"}`
                    )
                  }
                >
                  <Icon className="size-4" />
                </Button>
              ))}
              <label className="ml-auto inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs font-medium hover:bg-muted">
                <Paperclip className="size-4" />
                Attach
                <input
                  className="sr-only"
                  type="file"
                  multiple
                  onChange={(event) => void addFiles(event.target.files)}
                />
              </label>
            </div>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your message..."
              className="min-h-64 resize-y rounded-none border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          {attachments.length ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <button
                  type="button"
                  key={`${attachment.fileName}-${index}`}
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                >
                  <FileText className="size-3.5" />
                  {attachment.fileName}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter className="border-t px-5 py-4">
          <Button disabled={busy} type="button" variant="outline" onClick={() => void submit(true)}>
            Save draft
          </Button>
          <Button disabled={busy} type="button" onClick={() => void submit(false)}>
            <Send className="size-4" />
            {busy ? "Queuing..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function addresses(value: string) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function richHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character
  );
}
function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
