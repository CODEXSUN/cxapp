import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type {
  MailComposePayload,
  MailMessage,
  MailSettings,
  MailSettingsPayload,
  MailSummary,
  Mailbox
} from "./mail.types";

const API_BASE_URL = import.meta.env.VITE_PLATFORM_API_URL as string;

export function listMail(mailbox: Mailbox, search = "") {
  return mailRequest<MailMessage[]>(
    `/mail/messages?mailbox=${mailbox}&search=${encodeURIComponent(search)}`
  );
}
export function getMailSummary() {
  return mailRequest<MailSummary>("/mail/summary");
}
export function getMailSettings() {
  return mailRequest<MailSettings>("/mail/settings");
}
export function saveMailSettings(payload: MailSettingsPayload) {
  return mailRequest<MailSettings>("/mail/settings", {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function createMailMessage(payload: MailComposePayload) {
  return mailRequest<MailMessage>("/mail/messages", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function testMail(recipient: string) {
  return mailRequest<MailMessage>("/mail/test", {
    body: JSON.stringify({ recipient }),
    method: "POST"
  });
}
export function syncMail() {
  return mailRequest<unknown>("/mail/sync", { method: "POST" });
}
export function trashMail(id: string) {
  return mailRequest<MailMessage>(`/mail/messages/${id}/trash`, { method: "POST" });
}
export function restoreMail(id: string) {
  return mailRequest<MailMessage>(`/mail/messages/${id}/restore`, { method: "POST" });
}

export async function captureMailPdf(element: HTMLElement, fileName: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 1.6,
    useCORS: true
  });
  if (!canvas.width || !canvas.height || canvas.width * canvas.height > 20_000_000) {
    throw new Error("The document is too large to export safely as a PDF.");
  }
  const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const width = 190;
  const height = (canvas.height * width) / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.94);
  let offset = 10;
  pdf.addImage(image, "JPEG", 10, offset, width, height);
  let remaining = height - 277;
  while (remaining > 0) {
    offset -= 287;
    pdf.addPage();
    pdf.addImage(image, "JPEG", 10, offset, width, height);
    remaining -= 287;
  }
  const data = pdf.output("datauristring");
  return {
    base64: data,
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    mimeType: "application/pdf"
  };
}

export async function queueBillingDocumentEmail(input: {
  documentElement: HTMLElement;
  documentNumber: string;
  documentTitle: string;
  partyName: string;
  recipient: string;
}) {
  const attachment = await captureMailPdf(
    input.documentElement,
    input.documentNumber.replace(/[^a-zA-Z0-9_-]/g, "-") || "document"
  );
  const subject = `${input.documentTitle} ${input.documentNumber}`;
  const bodyText = `Hello ${input.partyName},\n\nPlease find the attached ${input.documentTitle} ${input.documentNumber}.\n\nRegards,\nCODEXSUN`;
  const bodyHtml = `<div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:28px;color:#172033"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden"><div style="background:#059669;color:#fff;padding:22px 26px"><div style="font-size:13px;opacity:.9">CODEXSUN Billing</div><div style="font-size:22px;font-weight:700;margin-top:4px">${escapeMailHtml(input.documentTitle)}</div></div><div style="padding:26px"><p>Hello ${escapeMailHtml(input.partyName)},</p><p>Please find your <strong>${escapeMailHtml(input.documentTitle)} ${escapeMailHtml(input.documentNumber)}</strong> attached as a PDF.</p><div style="margin-top:22px;padding:14px 16px;border-radius:8px;background:#f4f7f9;font-size:13px">Attachment: <strong>${escapeMailHtml(attachment.fileName)}</strong></div><p style="margin-top:24px;color:#64748b;font-size:13px">This message was sent securely from CODEXSUN.</p></div></div></div>`;
  return createMailMessage({
    attachments: [attachment],
    bcc: [],
    bodyHtml,
    bodyText,
    cc: [],
    saveAsDraft: false,
    scheduledAt: null,
    subject,
    to: [input.recipient.trim().toLowerCase()]
  });
}

function escapeMailHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character
  );
}

async function mailRequest<T>(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("codexsun_session_tenant");
  const tenantId = localStorage.getItem("codexsun_tenant_id");
  const tenantDatabase = localStorage.getItem("codexsun_tenant_db_name");
  const companyId = localStorage.getItem("codexsun.tenant.company-id");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(tenantDatabase ? { "x-tenant-db": tenantDatabase } : {}),
      ...(companyId ? { "x-company-id": companyId } : {}),
      ...(init.headers ?? {})
    }
  });
  const body = (await response.json()) as { data?: T; error?: { message?: string } };
  if (!response.ok)
    throw new Error(body.error?.message ?? `Mail request failed: ${response.status}`);
  return body.data as T;
}
