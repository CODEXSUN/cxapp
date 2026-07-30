import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { cn } from "@codexsun/ui/lib/utils";
import { MailComposeForm } from "./mail.form";
import { MailList } from "./mail.list";
import { MailSettingsForm } from "./mail.settings";
import { useMailWorkspace } from "./mail.hooks";
import type { MailComposePayload, MailMessage, Mailbox } from "./mail.types";

export function MailWorkspace({ mailbox }: { mailbox: Mailbox }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mail = useMailWorkspace(mailbox, search);
  const messages = mail.messages.data ?? [];
  useEffect(() => {
    setSearch("");
    setSelected(null);
  }, [mailbox]);
  useEffect(() => {
    setSelected((current) =>
      current ? (messages.find((item) => item.uuid === current.uuid) ?? null) : null
    );
  }, [messages]);
  const selectedIndex = useMemo(
    () => (selected ? messages.findIndex((item) => item.uuid === selected.uuid) : -1),
    [messages, selected]
  );

  async function compose(payload: MailComposePayload) {
    try {
      await mail.compose.mutateAsync(payload);
      toast.success(payload.saveAsDraft ? "Draft saved" : "Mail queued for delivery");
      setComposeOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <div className="relative grid min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)]">
        <section className="min-w-0 border-r">
          <div className="flex h-14 items-center gap-2 border-b px-3">
            <h2 className="text-lg font-semibold capitalize">{mailbox}</h2>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Sync inbox"
                disabled={mail.sync.isPending}
                onClick={() =>
                  void mail.sync
                    .mutateAsync()
                    .then(() => toast.success("Inbox sync queued"))
                    .catch((error) => toast.error(errorMessage(error)))
                }
              >
                <RefreshCw className={cn("size-4", mail.sync.isPending && "animate-spin")} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Mail settings"
                type="button"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-4" />
              </Button>
              <Button size="sm" type="button" onClick={() => setComposeOpen(true)}>
                <Send className="size-4" />
                Compose
              </Button>
            </div>
          </div>
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search mail"
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-15.5rem)] overflow-y-auto">
            <MailList
              loading={mail.messages.isLoading}
              messages={messages}
              selectedId={selected?.uuid ?? null}
              onSelect={setSelected}
            />
          </div>
        </section>

        <section
          className={cn(
            "absolute inset-0 z-10 flex min-w-0 flex-col bg-background lg:static",
            selected ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          {selected ? (
            <>
              <div className="flex h-14 items-center gap-1 border-b px-3">
                <Button
                  className="lg:hidden"
                  size="icon"
                  variant="ghost"
                  title="Close message"
                  onClick={() => setSelected(null)}
                >
                  <X className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Trash"
                  onClick={() =>
                    void mail.trash.mutateAsync(selected.uuid).then(() => {
                      toast.success("Moved to trash");
                      setSelected(null);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
                {mailbox === "trash" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void mail.restore
                        .mutateAsync(selected.uuid)
                        .then(() => toast.success("Message restored"))
                    }
                  >
                    Restore
                  </Button>
                ) : null}
                <div className="ml-auto flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Previous message"
                    disabled={selectedIndex <= 0}
                    onClick={() => setSelected(messages[selectedIndex - 1] ?? null)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Next message"
                    disabled={selectedIndex < 0 || selectedIndex >= messages.length - 1}
                    onClick={() => setSelected(messages[selectedIndex + 1] ?? null)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    className="lg:hidden"
                    size="icon"
                    variant="ghost"
                    title="Mail settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings2 className="size-4" />
                  </Button>
                  <Button
                    className="lg:hidden"
                    size="icon"
                    title="Compose"
                    onClick={() => setComposeOpen(true)}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
              <article className="flex-1 overflow-y-auto">
                <header className="border-b px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {initials(selected.fromName || selected.fromEmail)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{selected.subject}</h3>
                      <p className="mt-1 text-sm">
                        <span className="font-medium">
                          {selected.fromName || selected.fromEmail}
                        </span>{" "}
                        <span className="text-muted-foreground">&lt;{selected.fromEmail}&gt;</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        To: {selected.to.join(", ") || "—"}
                        {selected.replyTo ? ` · Reply-to: ${selected.replyTo}` : ""}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(selected.sentAt ?? selected.createdAt).toLocaleString()}
                    </time>
                  </div>
                </header>
                {selected.error ? (
                  <div className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {selected.error}
                  </div>
                ) : null}
                <div className="min-h-72 p-5">
                  {selected.bodyHtml ? (
                    <iframe
                      sandbox=""
                      title="Mail content"
                      srcDoc={selected.bodyHtml}
                      className="min-h-80 w-full border-0 bg-white"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-7">{selected.bodyText}</p>
                  )}
                </div>
                {selected.attachments.length ? (
                  <div className="border-t p-5">
                    <p className="mb-2 text-sm font-semibold">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.attachments.map((attachment) => (
                        <span
                          key={attachment.uuid}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                        >
                          <FileText className="size-4" />
                          {attachment.fileName}
                          <span className="text-muted-foreground">
                            {Math.ceil(attachment.sizeBytes / 1024)} KB
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Mail className="size-6" />
              </span>
              <div>
                <p className="font-medium text-foreground">No message selected</p>
                <p className="mt-1 text-sm">Choose a message to read it here.</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <MailComposeForm
        busy={mail.compose.isPending}
        onOpenChange={setComposeOpen}
        onSubmit={compose}
        open={composeOpen}
      />
      <MailSettingsForm
        busy={mail.saveSettings.isPending || mail.test.isPending}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={mail.settings.data}
        onSave={async (payload) => {
          try {
            await mail.saveSettings.mutateAsync(payload);
            toast.success("Mail settings saved");
            setSettingsOpen(false);
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
        onTest={async (recipient) => {
          try {
            await mail.test.mutateAsync(recipient);
            toast.success("Test mail queued");
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />
    </>
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
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Mail action failed.";
}
