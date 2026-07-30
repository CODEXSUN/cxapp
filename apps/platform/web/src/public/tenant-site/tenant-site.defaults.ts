import type { TenantPublicPortal } from "../../modules/tenant-portal";

export const fallbackTenantPortal: TenantPublicPortal = {
  brandName: "CODEXSUN",
  configured: false,
  domain: "",
  eyebrow: "Billing that keeps work moving",
  features: [
    {
      description: "Create clear sales documents with guided tax, totals, and payment details.",
      label: "01",
      title: "Fast, accurate invoicing"
    },
    {
      description: "Prepare e-way bills and e-invoices from organised billing information.",
      label: "02",
      title: "Compliance-ready documents"
    },
    {
      description: "Follow receivables, document status, and staff activity as work happens.",
      label: "03",
      title: "Real-time visibility"
    }
  ],
  footerText:
    "Billing, accounts, compliance documents, staff controls, and daily follow-up in one clear business flow.",
  headline: "Invoice faster. Stay accurate. Know what happens next.",
  loginPath: "/login",
  posts: [
    {
      description: "A clear billing flow that a new team member can understand quickly.",
      href: "/features",
      label: "Billing guide",
      title: "An invoice flow new staff can learn quickly"
    },
    {
      description: "Reuse checked invoice details to reduce repeated work during dispatch.",
      href: "/features",
      label: "E-way bill",
      title: "Prepare movement documents without double entry"
    },
    {
      description:
        "Keep pending work and document history clear when staff responsibilities change.",
      href: "/security",
      label: "Staff handover",
      title: "Switch people without losing the billing trail"
    }
  ],
  publicSiteUrl: null,
  slides: [
    {
      description: "Bring customer, item, tax, discount, and payment details into one guided flow.",
      label: "Invoice",
      title: "Create a complete invoice without the usual friction"
    },
    {
      description: "Reuse checked billing details for e-way bills and e-invoices.",
      label: "Compliance",
      title: "Move from billing to compliance with confidence"
    },
    {
      description:
        "Follow sales, receivables, staff activity, and document exceptions as work moves.",
      label: "Live view",
      title: "See billing work while it is happening"
    }
  ],
  summary:
    "Create invoices, prepare e-way bills and e-invoices, follow accounts, and keep staff work visible from one clean business system.",
  tenantCode: null,
  theme: "blue"
};
