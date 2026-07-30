import type { ReactNode } from "react";
import { useCompanyBranding } from "@codexsun/core-web/modules/organisation/company";
import { AppLayout } from "@codexsun/ui/layouts/app-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { SidebarBrand } from "@codexsun/ui/blocks/menu/sidemenu/app-sidebar";
import type { TopMenuWorkspaceItem } from "@codexsun/ui/blocks/menu/sidemenu/top-menu";
import {
  BarChart3Icon,
  FileTextIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShoppingCartIcon,
  ShipWheelIcon,
  WalletCardsIcon
} from "lucide-react";
import { useCompanyContextId } from "../../modules/settings";

const billingBrandBase: SidebarBrand = {
  href: "/billing",
  subtitle: "billing workspace",
  title: "Billing Desk"
};

const billingWorkspaceItems: TopMenuWorkspaceItem[] = [
  {
    active: true,
    description: "Sales workspace, print preview, and invoice operations.",
    icon: ReceiptTextIcon,
    title: "Billing",
    url: "/billing"
  }
];

export function BillingLayout({
  children,
  currentPath,
  headerTitle,
  subtitle,
  title
}: {
  children: ReactNode;
  currentPath: string;
  headerTitle: ReactNode;
  subtitle: ReactNode;
  title: ReactNode;
}) {
  const companyId = useCompanyContextId();
  const companyBranding = useCompanyBranding(companyId);
  const billingBrand: SidebarBrand = {
    ...billingBrandBase,
    ...(companyBranding.lightLogoUrl ? { logoSrc: companyBranding.lightLogoUrl } : {}),
    ...(companyBranding.darkLogoUrl ? { logoDarkSrc: companyBranding.darkLogoUrl } : {}),
    logoAlt: `${companyBranding.company?.name ?? "Company"} logo`,
    title: companyBranding.company?.name ?? billingBrandBase.title
  };
  const menuItems: SidemenuItem[] = [
    {
      icon: LayoutDashboardIcon,
      isActive: currentPath === "/billing" || currentPath === "/",
      title: "Overview",
      url: "/billing"
    },
    {
      icon: ReceiptTextIcon,
      isActive: currentPath.startsWith("/billing/sales"),
      items: [
        {
          isActive: currentPath === "/billing/sales",
          title: "Sales list",
          url: "/billing/sales"
        }
      ],
      title: "Sales",
      url: "/billing/sales"
    },
    {
      icon: FileTextIcon,
      isActive: currentPath.startsWith("/billing/quotation"),
      items: [
        {
          isActive: currentPath === "/billing/quotation",
          title: "Quotation list",
          url: "/billing/quotation"
        }
      ],
      title: "Quotation",
      url: "/billing/quotation"
    },
    {
      icon: ShoppingCartIcon,
      isActive: currentPath.startsWith("/billing/purchase"),
      items: [
        {
          isActive: currentPath === "/billing/purchase",
          title: "Purchase list",
          url: "/billing/purchase"
        }
      ],
      title: "Purchase",
      url: "/billing/purchase"
    },
    {
      icon: ShipWheelIcon,
      isActive: currentPath.startsWith("/billing/export-sales"),
      items: [
        {
          isActive: currentPath === "/billing/export-sales",
          title: "Export sales list",
          url: "/billing/export-sales"
        }
      ],
      title: "Export Sales",
      url: "/billing/export-sales"
    },
    {
      icon: WalletCardsIcon,
      isActive: currentPath.startsWith("/billing/payment"),
      items: [
        {
          isActive: currentPath === "/billing/payment",
          title: "Payment list",
          url: "/billing/payment"
        }
      ],
      title: "Payment",
      url: "/billing/payment"
    },
    {
      icon: WalletCardsIcon,
      isActive: currentPath.startsWith("/billing/receipt"),
      items: [
        {
          isActive: currentPath === "/billing/receipt",
          title: "Receipt list",
          url: "/billing/receipt"
        }
      ],
      title: "Receipt",
      url: "/billing/receipt"
    },
    {
      icon: BarChart3Icon,
      isActive: currentPath.startsWith("/billing/reports"),
      items: [
        {
          isActive: currentPath === "/billing/reports/customer-statement",
          title: "Customer Statement",
          url: "/billing/reports/customer-statement"
        },
        {
          isActive: currentPath === "/billing/reports/supplier-statement",
          title: "Supplier Statement",
          url: "/billing/reports/supplier-statement"
        },
        {
          isActive: currentPath === "/billing/reports/stock-statement",
          title: "Stock Statement",
          url: "/billing/reports/stock-statement"
        },
        {
          isActive: currentPath === "/billing/reports/gst-statement",
          title: "GST Statement",
          url: "/billing/reports/gst-statement"
        }
      ],
      title: "Reports",
      url: "/billing/reports/customer-statement"
    },
    {
      icon: SettingsIcon,
      isActive: currentPath.startsWith("/billing/settings"),
      items: [
        {
          isActive: currentPath === "/billing/settings",
          title: "Billing Settings",
          url: "/billing/settings"
        },
        {
          isActive:
            currentPath === "/billing/settings/documents" ||
            currentPath === "/billing/settings/sales",
          title: "Document Settings",
          url: "/billing/settings/documents"
        }
      ],
      title: "Settings",
      url: "/billing/settings"
    }
  ];

  return (
    <AppLayout
      brand={billingBrand}
      headerTitle={headerTitle}
      homeHref="/billing"
      logoutHref="/billing"
      menuItems={menuItems}
      subtitle={subtitle}
      title={title}
      user={{
        email: "billing@codexsun.app",
        fallback: "B",
        name: "Billing User"
      }}
      userMenuItems={[
        { icon: HomeIcon, title: "Billing home", url: "/billing" },
        { icon: ReceiptTextIcon, title: "Sales", url: "/billing/sales" },
        { icon: FileTextIcon, title: "Quotation", url: "/billing/quotation" },
        { icon: ShoppingCartIcon, title: "Purchase", url: "/billing/purchase" },
        { icon: ShipWheelIcon, title: "Export Sales", url: "/billing/export-sales" },
        { icon: WalletCardsIcon, title: "Payment", url: "/billing/payment" },
        { icon: WalletCardsIcon, title: "Receipt", url: "/billing/receipt" },
        {
          icon: BarChart3Icon,
          title: "Reports",
          url: "/billing/reports/customer-statement"
        },
        { icon: SettingsIcon, title: "Billing Settings", url: "/billing/settings" },
        { icon: SettingsIcon, title: "Document Settings", url: "/billing/settings/documents" }
      ]}
      versionLabel={`v ${__APP_VERSION__}`}
      workspaceItems={billingWorkspaceItems}
    >
      {children}
    </AppLayout>
  );
}
