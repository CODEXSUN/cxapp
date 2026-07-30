export type BillingGstApiMode = "none" | "einvoice_eway" | "eway_only";

export type BillingDocumentKind = "quotation" | "sales" | "purchase" | "payment" | "receipt";
export type BillingNumberDocumentKind = BillingDocumentKind | "exportSales";

export type BillingDocumentNumberSettings = {
  automatic: boolean;
  nextNumber: number;
  padding: number;
  prefix: string;
  separator: string;
  suffix: string;
  usePrefix: boolean;
  useSeparator: boolean;
  useSuffix: boolean;
};

export type BillingDocumentLayoutSettings = {
  useColour: boolean;
  useDc: boolean;
  useEinvoice: boolean;
  useEway: boolean;
  usePo: boolean;
  useSize: boolean;
};

export type BillingSettings = {
  features: {
    exportSales: boolean;
    quotation: boolean;
    tconnect: boolean;
  };
  gstApiMode: BillingGstApiMode;
  layout: BillingDocumentLayoutSettings;
  numbering: Record<BillingNumberDocumentKind, BillingDocumentNumberSettings>;
  customise: {
    documentTitles: Record<BillingDocumentKind, string>;
    printLanguage: "english";
  };
  printing: {
    addressMode: "billing_only" | "billing_and_shipping";
    customTerms: string;
    letterhead: {
      addressColor: string;
      addressFont: string;
      addressSize: number;
      borderColor: string;
      companyColor: string;
      companyFont: string;
      companySize: number;
      contactSize: number;
      headerHeightMm: number;
      logoHeightMm: number;
      logoLeftMm: number;
      logoTopMm: number;
      logoWidthMm: number;
      taxSize: number;
    };
    printAccountNumber: boolean;
    printQrAccountDetails: boolean;
    printWithLogo: boolean;
  };
};

export type BillingSalesSettings = BillingSettings;

export const defaultBillingDocumentLayoutSettings: BillingDocumentLayoutSettings = {
  useColour: true,
  useDc: false,
  useEinvoice: true,
  useEway: true,
  usePo: false,
  useSize: true
};

export const defaultBillingSettings: BillingSettings = {
  features: {
    exportSales: false,
    quotation: true,
    tconnect: true
  },
  gstApiMode: "einvoice_eway",
  layout: { ...defaultBillingDocumentLayoutSettings },
  numbering: {
    exportSales: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "EXP",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    },
    payment: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "PAY",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    },
    purchase: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "PUR",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    },
    quotation: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "QUO",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    },
    sales: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "SAL",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    },
    receipt: {
      automatic: true,
      nextNumber: 1,
      padding: 4,
      prefix: "REC",
      separator: "-",
      suffix: "",
      usePrefix: true,
      useSeparator: true,
      useSuffix: false
    }
  },
  customise: {
    documentTitles: {
      purchase: "Purchase",
      payment: "Payment Voucher",
      quotation: "Quotation",
      receipt: "Receipt Voucher",
      sales: "Tax Invoice"
    },
    printLanguage: "english"
  },
  printing: {
    addressMode: "billing_and_shipping",
    customTerms: "",
    letterhead: {
      addressColor: "#111827",
      addressFont: "Times New Roman",
      addressSize: 12,
      borderColor: "#9ca3af",
      companyColor: "#000000",
      companyFont: "Times New Roman",
      companySize: 32,
      contactSize: 11,
      headerHeightMm: 42,
      logoHeightMm: 24,
      logoLeftMm: 4,
      logoTopMm: 9,
      logoWidthMm: 28,
      taxSize: 11
    },
    printAccountNumber: true,
    printQrAccountDetails: true,
    printWithLogo: true
  }
};

export const defaultBillingSalesSettings = defaultBillingSettings;

export function formatBillingDocumentNumber(settings: BillingDocumentNumberSettings) {
  const number = String(Math.max(1, settings.nextNumber)).padStart(
    Math.max(1, settings.padding),
    "0"
  );
  return `${settings.usePrefix ? settings.prefix : ""}${settings.useSeparator ? settings.separator : ""}${number}${settings.useSuffix ? settings.suffix : ""}`;
}

export function nextBillingDocumentNumber(
  settings: BillingDocumentNumberSettings,
  documentNumber: string
) {
  const prefix = `${settings.usePrefix ? settings.prefix : ""}${settings.useSeparator ? settings.separator : ""}`;
  const suffix = settings.useSuffix ? settings.suffix : "";
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = documentNumber
    .trim()
    .match(new RegExp(`^${escape(prefix)}(\\d+)${escape(suffix)}$`, "i"));
  return Math.max(settings.nextNumber, match ? Number(match[1]) + 1 : settings.nextNumber);
}
