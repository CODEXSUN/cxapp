import { AlertCircle, Clock3, Paperclip } from "lucide-react";
import { cn } from "@codexsun/ui/lib/utils";
import type { MailMessage } from "./mail.types";

export function MailList({
  loading,
  messages,
  onSelect,
  selectedId
}: {
  loading: boolean;
  messages: MailMessage[];
  onSelect: (message: MailMessage) => void;
  selectedId: string | null;
}) {
  if (loading)
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="h-28 animate-pulse rounded-lg bg-muted" key={index} />
        ))}
      </div>
    );
  if (!messages.length)
    return (
      <div className="flex h-64 items-center justify-center px-8 text-center text-sm text-muted-foreground">
        No messages in this mailbox.
      </div>
    );
  return (
    <div className="space-y-2.5 p-3">
      {messages.map((message) => {
        const sender =
          message.direction === "inbound"
            ? message.fromName || message.fromEmail
            : message.to.join(", ") || "No recipient";
        return (
          <button
            key={message.uuid}
            type="button"
            onClick={() => onSelect(message)}
            className={cn(
              "w-full cursor-pointer rounded-lg border bg-card p-3 text-left transition hover:border-primary/35 hover:bg-muted/25",
              selectedId === message.uuid && "border-primary/45 bg-primary/[0.04] shadow-sm"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {initials(sender)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{sender}</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeDate(message.sentAt ?? message.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium">{message.subject}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {message.bodyText || stripHtml(message.bodyHtml) || "No message preview"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusChip status={message.status} />
                  {message.attachments.length ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Paperclip className="size-3" />
                      {message.attachments.length}
                    </span>
                  ) : null}
                  {message.failedAt ? <AlertCircle className="size-3.5 text-destructive" /> : null}
                  {message.status === "queued" ? (
                    <Clock3 className="size-3.5 text-amber-600" />
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusChip({ status }: { status: MailMessage["status"] }) {
  const tones = {
    cancelled: "bg-slate-100 text-slate-600",
    draft: "bg-slate-100 text-slate-700",
    failed: "bg-red-50 text-red-700",
    queued: "bg-amber-50 text-amber-700",
    sending: "bg-blue-50 text-blue-700",
    sent: "bg-emerald-50 text-emerald-700"
  };
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", tones[status])}
    >
      {status}
    </span>
  );
}

function initials(value: string) {
  return (
    value
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "M"
  );
}
function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  return days <= 0
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : days === 1
      ? "Yesterday"
      : days < 7
        ? `${days} days ago`
        : date.toLocaleDateString([], { day: "2-digit", month: "short" });
}
