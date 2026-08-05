import { captureMailPdf } from "@cxapp/mail-web/modules/mail";
import { billingApiPost } from "./api/billing-api";

export type BillingDocumentKind = "export-sales" | "purchase" | "quotation" | "sales";

export type BillingPdfQueueResult = {
  jobId: number;
  jobUuid: string;
  status: "cancelled" | "completed" | "failed" | "pending" | "running";
};

export async function buildAndQueueBillingDocumentPdf(input: {
  documentElement: HTMLElement;
  documentKind: BillingDocumentKind;
  documentNumber: string;
  documentTitle: string;
}) {
  const fileName = billingDocumentFileName(input.documentTitle, input.documentNumber);
  const attachment = await captureMailPdf(input.documentElement, fileName);
  const bytes = decodePdfBytes(attachment.base64);
  const sha256 = await sha256Hex(bytes);
  const job = await billingApiPost<BillingPdfQueueResult>("/tenant/queue/artifacts", {
    artifactType: "pdf",
    category: `billing-${input.documentKind}`,
    fileName: attachment.fileName,
    label: `${input.documentTitle} ${input.documentNumber}`.trim(),
    sha256,
    sizeBytes: bytes.byteLength
  });
  return { attachment, job };
}

export function downloadBillingDocumentPdf(attachment: Awaited<ReturnType<typeof captureMailPdf>>) {
  const link = document.createElement("a");
  link.download = attachment.fileName;
  link.href = attachment.base64.includes(",")
    ? attachment.base64
    : `data:${attachment.mimeType};base64,${attachment.base64}`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function requireBillingDocumentElement() {
  const element = document.querySelector<HTMLElement>(".billing-mail-document");
  if (!element) throw new Error("The document preview is not ready.");
  return element;
}

export function reserveBillingDocumentWhatsAppPage() {
  const page = window.open("", "_blank");
  if (!page) throw new Error("WhatsApp was blocked. Allow pop-ups and try again.");
  page.opener = null;
  page.document.title = "Preparing WhatsApp document";
  page.document.body.textContent = "Preparing the PDF and opening WhatsApp...";
  return page;
}

export function openBillingDocumentWhatsApp(
  page: Window,
  input: {
    documentNumber: string;
    documentTitle: string;
    partyName: string;
    phone: string;
  }
) {
  const phone = normalizeWhatsAppPhone(input.phone);
  if (!phone) throw new Error("Enter a valid WhatsApp number with 8 to 15 digits.");
  const message = [
    `Hello ${input.partyName || "there"},`,
    `Please find ${input.documentTitle} ${input.documentNumber}.`,
    "The PDF has been downloaded and is ready to attach in WhatsApp."
  ].join("\n\n");
  page.location.replace(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  return phone;
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.trim().replace(/^00/u, "").replace(/\D/gu, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function billingDocumentFileName(title: string, number: string) {
  const base = `${title}-${number}`
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "billing-document"}.pdf`;
}

function decodePdfBytes(value: string) {
  const base64 = value.includes(",") ? (value.split(",").at(-1) ?? "") : value;
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure PDF verification is not available in this browser.");
  }
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(
    ""
  );
}
