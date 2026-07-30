import {
  AlertTriangleIcon,
  ArchiveIcon,
  BarChart3Icon,
  Building2Icon,
  CircleGaugeIcon,
  Clock3Icon,
  CreditCardIcon,
  FileTextIcon,
  Globe2Icon,
  InboxIcon,
  LandmarkIcon,
  MailIcon,
  MapPinnedIcon,
  PackageIcon,
  Settings2Icon,
  UsersIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  type LucideIcon
} from "lucide-react";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";

export type PlatformAppId = "application" | "billing" | "mail" | "task-manager";

export type BillingNavigationFeatures = {
  exportSales: boolean;
  quotation: boolean;
};

export type PlatformAppDefinition = {
  accentClass: string;
  alwaysEnabled: boolean;
  defaultLanding: boolean;
  description: string;
  id: PlatformAppId;
  icon: LucideIcon;
  label: string;
  moduleKey: string;
  stack: "platform" | "billing" | "mail";
};

export const defaultTenantModuleKeys = ["platform.application", "billing.sales", "mail"] as const;

export const platformAppRegistry: PlatformAppDefinition[] = [
  {
    accentClass: "bg-slate-950",
    alwaysEnabled: true,
    defaultLanding: true,
    description: "Platform workspace, tenant profile, application settings, users, and access.",
    icon: LayoutDashboardIcon,
    id: "application",
    label: "Application",
    moduleKey: "platform.application",
    stack: "platform"
  },
  {
    accentClass: "bg-emerald-600",
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Sales, purchase, receipt, payment, report, master, common, and billing settings.",
    icon: ReceiptTextIcon,
    id: "billing",
    label: "Billing",
    moduleKey: "billing.sales",
    stack: "billing"
  },
  {
    accentClass: "bg-sky-600",
    alwaysEnabled: false,
    defaultLanding: false,
    description:
      "Tenant inbox, rich compose, SMTP delivery, drafts, sent history, failures, and provider settings.",
    icon: MailIcon,
    id: "mail",
    label: "Mail",
    moduleKey: "mail",
    stack: "mail"
  }
];

export function normalizeModuleKeys(moduleKeys: string[]) {
  return Array.from(
    new Set([
      "platform.application",
      ...moduleKeys.map((key) => (key === "platform.tenant" ? "platform.application" : key))
    ])
  );
}

export function enabledAppIds(moduleKeys: string[]) {
  const enabled = new Set(normalizeModuleKeys(moduleKeys));
  return platformAppRegistry
    .filter((app) => app.alwaysEnabled || enabled.has(app.moduleKey))
    .map((app) => app.id);
}

export function defaultLandingApp(value: unknown, moduleKeys: string[]): PlatformAppId {
  const requested = typeof value === "string" ? value : "";
  const enabled = enabledAppIds(moduleKeys);
  return enabled.includes(requested as PlatformAppId)
    ? (requested as PlatformAppId)
    : "application";
}

export function appMenuFor(
  appId: PlatformAppId,
  activePage: string,
  onSelect: (page: string) => void,
  billingFeatures?: BillingNavigationFeatures
): SidemenuItem {
  if (appId === "mail") {
    return {
      icon: MailIcon,
      isActive: activePage.startsWith("mail"),
      onSelect: () => onSelect("mail.inbox"),
      title: "Mail"
    };
  }
  if (appId === "billing") {
    return {
      icon: ReceiptTextIcon,
      isActive: activePage.startsWith("billing") || activePage.startsWith("core"),
      title: "Billing",
      items: [
        {
          title: "Overview",
          isActive: activePage === "billing.overview",
          onSelect: () => onSelect("billing.overview")
        },
        ...(billingFeatures?.quotation !== false
          ? [
              {
                title: "Quotation",
                isActive: activePage === "billing.quotation",
                onSelect: () => onSelect("billing.quotation")
              }
            ]
          : []),
        {
          title: "Sales",
          isActive: activePage === "billing.sales",
          onSelect: () => onSelect("billing.sales")
        },
        {
          title: "Purchase",
          isActive: activePage === "billing.purchase",
          onSelect: () => onSelect("billing.purchase")
        },
        ...(billingFeatures?.exportSales !== false
          ? [
              {
                title: "Export Sales",
                isActive: activePage === "billing.export-sales",
                onSelect: () => onSelect("billing.export-sales")
              }
            ]
          : []),
        {
          title: "Payment",
          isActive: activePage === "billing.payment",
          onSelect: () => onSelect("billing.payment")
        },
        {
          title: "Receipt",
          isActive: activePage === "billing.receipt",
          onSelect: () => onSelect("billing.receipt")
        },
        {
          icon: PackageIcon,
          title: "Master",
          isActive:
            activePage === "core.master.contact" ||
            activePage === "core.master.product" ||
            activePage === "core.master.work-order",
          items: [
            {
              title: "Contact",
              isActive: activePage === "core.master.contact",
              onSelect: () => onSelect("core.master.contact")
            },
            {
              title: "Product",
              isActive: activePage === "core.master.product",
              onSelect: () => onSelect("core.master.product")
            },
            {
              title: "Work Order",
              isActive: activePage === "core.master.work-order",
              onSelect: () => onSelect("core.master.work-order")
            }
          ]
        },
        {
          title: "Common",
          isActive: activePage.startsWith("core.common"),
          items: [
            {
              icon: MapPinnedIcon,
              title: "Location",
              isActive: activePage.startsWith("core.common.location"),
              items: [
                {
                  title: "Countries",
                  isActive: activePage === "core.common.location.countries",
                  onSelect: () => onSelect("core.common.location.countries")
                },
                {
                  title: "States",
                  isActive: activePage === "core.common.location.states",
                  onSelect: () => onSelect("core.common.location.states")
                },
                {
                  title: "Districts",
                  isActive: activePage === "core.common.location.districts",
                  onSelect: () => onSelect("core.common.location.districts")
                },
                {
                  title: "Cities",
                  isActive: activePage === "core.common.location.cities",
                  onSelect: () => onSelect("core.common.location.cities")
                },
                {
                  title: "Pincodes",
                  isActive: activePage === "core.common.location.pincodes",
                  onSelect: () => onSelect("core.common.location.pincodes")
                }
              ]
            },
            ...commonMasterMenuGroups(activePage, onSelect)
          ]
        },
        {
          title: "Billing Settings",
          isActive: activePage === "billing.settings",
          onSelect: () => onSelect("billing.settings")
        },
        {
          title: "Document Settings",
          isActive: activePage === "billing.document-settings",
          onSelect: () => onSelect("billing.document-settings")
        }
      ]
    };
  }

  return {
    icon: Building2Icon,
    isActive: activePage.startsWith("application") || activePage.startsWith("core.organisation"),
    title: "Application",
    items: [
      {
        title: "Overview",
        isActive: activePage === "application.overview",
        onSelect: () => onSelect("application.overview")
      },
      {
        title: "Application",
        isActive:
          activePage === "application.landing" ||
          activePage === "application.profile" ||
          activePage === "application.settings",
        items: [
          {
            title: "Landing Desk",
            isActive: activePage === "application.landing",
            onSelect: () => onSelect("application.landing")
          },
          {
            title: "Platform Profile",
            isActive: activePage === "application.profile",
            onSelect: () => onSelect("application.profile")
          },
          {
            title: "Settings",
            isActive: activePage === "application.settings",
            onSelect: () => onSelect("application.settings")
          }
        ]
      },
      {
        icon: ShieldCheckIcon,
        title: "Access Control",
        isActive: activePage.startsWith("application.access"),
        items: [
          {
            title: "Users",
            isActive: activePage === "application.access.users",
            onSelect: () => onSelect("application.access.users")
          },
          {
            title: "Roles",
            isActive: activePage === "application.access.roles",
            onSelect: () => onSelect("application.access.roles")
          },
          {
            title: "Permissions",
            isActive: activePage === "application.access.permissions",
            onSelect: () => onSelect("application.access.permissions")
          },
          {
            title: "User Roles",
            isActive: activePage === "application.access.user-roles",
            onSelect: () => onSelect("application.access.user-roles")
          },
          {
            title: "Role Permissions",
            isActive: activePage === "application.access.role-permissions",
            onSelect: () => onSelect("application.access.role-permissions")
          }
        ]
      },
      {
        icon: Building2Icon,
        title: "Organisation",
        isActive: activePage.startsWith("core.organisation"),
        items: [
          {
            title: "Company",
            isActive: activePage === "core.organisation.company",
            onSelect: () => onSelect("core.organisation.company")
          },
          {
            title: "Financial Years",
            isActive: activePage === "core.organisation.financial-year",
            onSelect: () => onSelect("core.organisation.financial-year")
          },
          {
            title: "Default Company",
            isActive: activePage === "core.organisation.default-company",
            onSelect: () => onSelect("core.organisation.default-company")
          }
        ]
      }
    ]
  };
}

export function appMenuItemsFor(
  appId: PlatformAppId,
  activePage: string,
  onSelect: (page: string) => void,
  billingFeatures?: BillingNavigationFeatures
): SidemenuItem[] {
  if (appId === "mail") {
    return [
      {
        icon: InboxIcon,
        isActive: activePage === "mail.inbox" || activePage === "mail.overview",
        onSelect: () => onSelect("mail.inbox"),
        title: "Inbox"
      },
      {
        icon: SendIcon,
        isActive: activePage === "mail.outbox",
        onSelect: () => onSelect("mail.outbox"),
        title: "Outbox"
      },
      {
        icon: FileTextIcon,
        isActive: activePage === "mail.drafts",
        onSelect: () => onSelect("mail.drafts"),
        title: "Drafts"
      },
      {
        icon: Clock3Icon,
        isActive: activePage === "mail.scheduled",
        onSelect: () => onSelect("mail.scheduled"),
        title: "Scheduled"
      },
      {
        icon: ArchiveIcon,
        isActive: activePage === "mail.sent",
        onSelect: () => onSelect("mail.sent"),
        title: "Sent"
      },
      {
        icon: AlertTriangleIcon,
        isActive: activePage === "mail.failed",
        onSelect: () => onSelect("mail.failed"),
        title: "Failed"
      },
      {
        icon: Trash2Icon,
        isActive: activePage === "mail.trash",
        onSelect: () => onSelect("mail.trash"),
        title: "Trash"
      }
    ];
  }
  if (appId === "billing") {
    return [
      {
        icon: CircleGaugeIcon,
        isActive: activePage === "billing.overview",
        onSelect: () => onSelect("billing.overview"),
        title: "Overview"
      },
      {
        icon: ReceiptTextIcon,
        isActive:
          activePage === "billing.quotation" ||
          activePage === "billing.sales" ||
          activePage === "billing.purchase" ||
          activePage === "billing.export-sales" ||
          activePage === "billing.payment" ||
          activePage === "billing.receipt",
        title: "Billing",
        items: [
          ...(billingFeatures?.quotation !== false
            ? [
                {
                  title: "Quotation",
                  isActive: activePage === "billing.quotation",
                  onSelect: () => onSelect("billing.quotation")
                }
              ]
            : []),
          {
            title: "Sales",
            isActive: activePage === "billing.sales",
            onSelect: () => onSelect("billing.sales")
          },
          {
            title: "Purchase",
            isActive: activePage === "billing.purchase",
            onSelect: () => onSelect("billing.purchase")
          },
          ...(billingFeatures?.exportSales !== false
            ? [
                {
                  title: "Export Sales",
                  isActive: activePage === "billing.export-sales",
                  onSelect: () => onSelect("billing.export-sales")
                }
              ]
            : []),
          {
            title: "Payment",
            isActive: activePage === "billing.payment",
            onSelect: () => onSelect("billing.payment")
          },
          {
            title: "Receipt",
            isActive: activePage === "billing.receipt",
            onSelect: () => onSelect("billing.receipt")
          }
        ]
      },
      {
        icon: BarChart3Icon,
        isActive: activePage.startsWith("billing.reports."),
        title: "Report",
        items: [
          {
            title: "Customer Statement",
            isActive: activePage === "billing.reports.customer-statement",
            onSelect: () => onSelect("billing.reports.customer-statement")
          },
          {
            title: "Supplier Statement",
            isActive: activePage === "billing.reports.supplier-statement",
            onSelect: () => onSelect("billing.reports.supplier-statement")
          },
          {
            title: "Stock Statement",
            isActive: activePage === "billing.reports.stock-statement",
            onSelect: () => onSelect("billing.reports.stock-statement")
          },
          {
            title: "GST Statement",
            isActive: activePage === "billing.reports.gst-statement",
            onSelect: () => onSelect("billing.reports.gst-statement")
          }
        ]
      },
      {
        icon: PackageIcon,
        isActive:
          activePage === "core.master.contact" ||
          activePage === "core.master.product" ||
          activePage === "core.master.work-order",
        title: "Master",
        items: [
          {
            title: "Contact",
            isActive: activePage === "core.master.contact",
            onSelect: () => onSelect("core.master.contact")
          },
          {
            title: "Product",
            isActive: activePage === "core.master.product",
            onSelect: () => onSelect("core.master.product")
          },
          {
            title: "Work Order",
            isActive: activePage === "core.master.work-order",
            onSelect: () => onSelect("core.master.work-order")
          }
        ]
      },
      {
        icon: Globe2Icon,
        isActive: activePage.startsWith("core.common"),
        title: "Common",
        items: [
          {
            icon: MapPinnedIcon,
            title: "Location",
            isActive: activePage.startsWith("core.common.location"),
            items: [
              {
                title: "Countries",
                isActive: activePage === "core.common.location.countries",
                onSelect: () => onSelect("core.common.location.countries")
              },
              {
                title: "States",
                isActive: activePage === "core.common.location.states",
                onSelect: () => onSelect("core.common.location.states")
              },
              {
                title: "Districts",
                isActive: activePage === "core.common.location.districts",
                onSelect: () => onSelect("core.common.location.districts")
              },
              {
                title: "Cities",
                isActive: activePage === "core.common.location.cities",
                onSelect: () => onSelect("core.common.location.cities")
              },
              {
                title: "Pincodes",
                isActive: activePage === "core.common.location.pincodes",
                onSelect: () => onSelect("core.common.location.pincodes")
              }
            ]
          },
          ...commonMasterMenuGroups(activePage, onSelect)
        ]
      },
      {
        icon: Settings2Icon,
        isActive: activePage === "billing.settings" || activePage === "billing.document-settings",
        title: "Settings",
        items: [
          {
            title: "Billing Settings",
            isActive: activePage === "billing.settings",
            onSelect: () => onSelect("billing.settings")
          },
          {
            title: "Document Settings",
            isActive: activePage === "billing.document-settings",
            onSelect: () => onSelect("billing.document-settings")
          }
        ]
      }
    ];
  }

  return [
    {
      icon: CircleGaugeIcon,
      isActive: activePage === "application.overview",
      onSelect: () => onSelect("application.overview"),
      title: "Overview"
    },
    {
      icon: ShieldCheckIcon,
      isActive: activePage.startsWith("application.access"),
      title: "Access Control",
      items: [
        {
          title: "Users",
          isActive: activePage === "application.access.users",
          onSelect: () => onSelect("application.access.users")
        },
        {
          title: "Roles",
          isActive: activePage === "application.access.roles",
          onSelect: () => onSelect("application.access.roles")
        },
        {
          title: "Permissions",
          isActive: activePage === "application.access.permissions",
          onSelect: () => onSelect("application.access.permissions")
        },
        {
          title: "User Roles",
          isActive: activePage === "application.access.user-roles",
          onSelect: () => onSelect("application.access.user-roles")
        },
        {
          title: "Role Permissions",
          isActive: activePage === "application.access.role-permissions",
          onSelect: () => onSelect("application.access.role-permissions")
        }
      ]
    },
    {
      icon: Building2Icon,
      isActive:
        activePage === "application.landing" ||
        activePage === "application.profile" ||
        activePage === "application.settings",
      title: "Application",
      items: [
        {
          title: "Landing Desk",
          isActive: activePage === "application.landing",
          onSelect: () => onSelect("application.landing")
        },
        {
          title: "Platform Profile",
          isActive: activePage === "application.profile",
          onSelect: () => onSelect("application.profile")
        },
        {
          title: "Settings",
          isActive: activePage === "application.settings",
          onSelect: () => onSelect("application.settings")
        }
      ]
    },
    {
      icon: Building2Icon,
      isActive: activePage.startsWith("core.organisation"),
      title: "Organisation",
      items: [
        {
          title: "Company",
          isActive: activePage === "core.organisation.company",
          onSelect: () => onSelect("core.organisation.company")
        },
        {
          title: "Financial Years",
          isActive: activePage === "core.organisation.financial-year",
          onSelect: () => onSelect("core.organisation.financial-year")
        },
        {
          title: "Default Company",
          isActive: activePage === "core.organisation.default-company",
          onSelect: () => onSelect("core.organisation.default-company")
        }
      ]
    }
  ];
}

export function appWorkspaceItems(enabledApps: PlatformAppId[], activeApp: PlatformAppId) {
  return platformAppRegistry
    .filter((app) => enabledApps.includes(app.id))
    .map((app) => ({
      active: app.id === activeApp,
      description: app.description,
      icon: app.icon,
      title: app.label,
      url: `/app/${app.id}/overview`
    }));
}

export const applicationPageIcons = {
  application: Building2Icon,
  billing: CreditCardIcon,
  mail: MailIcon
};

function commonMasterMenuGroups(
  activePage: string,
  onSelect: (page: string) => void
): SidemenuItem[] {
  const groups = [
    {
      icon: LandmarkIcon,
      id: "accounts",
      label: "Accounts",
      pages: [
        ["Ledger Groups", "core.common.accounts.ledger-groups"],
        ["Ledgers", "core.common.accounts.ledgers"]
      ]
    },
    {
      icon: UsersIcon,
      id: "contacts",
      label: "Contacts",
      pages: [
        ["Contact Groups", "core.common.contacts.contact-groups"],
        ["Contact Types", "core.common.contacts.contact-types"],
        ["Address Types", "core.common.contacts.address-types"],
        ["Bank Names", "core.common.contacts.bank-names"]
      ]
    },
    {
      icon: PackageIcon,
      id: "products",
      label: "Product",
      pages: [
        ["Product Groups", "core.common.products.product-groups"],
        ["Product Categories", "core.common.products.product-categories"],
        ["Product Types", "core.common.products.product-types"],
        ["Units", "core.common.products.units"],
        ["HSN Codes", "core.common.products.hsn-codes"],
        ["Taxes", "core.common.products.taxes"],
        ["Brands", "core.common.products.brands"],
        ["Colours", "core.common.products.colours"],
        ["Sizes", "core.common.products.sizes"],
        ["Styles", "core.common.products.styles"]
      ]
    },
    {
      icon: ClipboardListIcon,
      id: "workorder",
      label: "Work Orders",
      pages: [
        ["Work Order Types", "core.common.workorder.work-order-types"],
        ["Transports", "core.common.workorder.transports"],
        ["Warehouses", "core.common.workorder.warehouses"],
        ["Destinations", "core.common.workorder.destinations"],
        ["Stock Rejection Types", "core.common.workorder.stock-rejection-types"]
      ]
    },
    {
      icon: Settings2Icon,
      id: "others",
      label: "Others",
      pages: [
        ["Currencies", "core.common.others.currencies"],
        ["Priorities", "core.common.others.priorities"],
        ["Payment Terms", "core.common.others.payment-terms"],
        ["Sales Types", "core.common.others.sales-types"],
        ["Months", "core.common.others.months"]
      ]
    }
  ] as const;
  return groups.map((group) => ({
    icon: group.icon,
    isActive: activePage.startsWith(`core.common.${group.id}.`),
    items: group.pages.map(([title, page]) => ({
      isActive: activePage === page,
      onSelect: () => onSelect(page),
      title
    })),
    title: group.label
  }));
}
