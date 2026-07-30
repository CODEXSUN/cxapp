import type { CSSProperties, ReactNode } from "react";
import {
  AppWindowIcon,
  BadgeCheckIcon,
  BriefcaseBusinessIcon,
  CreditCardIcon,
  Globe2Icon,
  LogOutIcon,
  MailIcon,
  MonitorCogIcon,
  PanelsTopLeftIcon,
  RefreshCwIcon,
  SparklesIcon,
  UsersRoundIcon,
  WalletCardsIcon
} from "lucide-react";

import {
  AppSidebar,
  type SidebarBrand,
  type SidebarUser,
  type SidebarUserMenuItem
} from "../blocks/menu/sidemenu/app-sidebar";
import { TopMenu, type TopMenuWorkspaceItem } from "../blocks/menu/sidemenu/top-menu";
import type { SidemenuItem } from "../blocks/menu/sidemenu/sub/sidemenu-section";
import { SidebarInset, SidebarProvider } from "../components/sidebar";

type AppLayoutProps = {
  brand?: SidebarBrand;
  children: ReactNode;
  headerTitle?: ReactNode;
  homeHref?: string;
  logoutHref?: string;
  menuItems?: SidemenuItem[];
  onLogout?: () => void | Promise<void>;
  subtitle?: ReactNode;
  title?: ReactNode;
  user?: SidebarUser;
  userMenuItems?: SidebarUserMenuItem[];
  versionLabel?: string;
  workspaceItems?: TopMenuWorkspaceItem[];
  showPageTitle?: boolean;
};

export const defaultWorkspaceItems: TopMenuWorkspaceItem[] = [
  {
    title: "Application",
    description: "Shared workspace, company setup, and modules.",
    icon: BriefcaseBusinessIcon,
    url: "/workspace"
  },
  {
    title: "ZETRO",
    description: "Business assistance chat for teams.",
    icon: SparklesIcon,
    url: "/app"
  },
  {
    title: "Operations",
    description: "Tenant workspace and operational modules.",
    icon: AppWindowIcon,
    active: true,
    url: "/workspace"
  },
  {
    title: "Mail",
    description: "Reusable workspace mail services.",
    icon: MailIcon,
    url: "/app"
  },
  {
    title: "Tools",
    description: "Tenant tools and app extensions.",
    icon: Globe2Icon,
    url: "/app"
  }
];

export const defaultAppMenuItems: SidemenuItem[] = [
  {
    title: "Admin",
    url: "/workspace",
    icon: WalletCardsIcon,
    isActive: true,
    items: [
      {
        title: "Master Modules",
        url: "/workspace"
      },
      {
        title: "Platform Masters",
        url: "/admin"
      },
      {
        title: "Security Surface",
        url: "/app"
      }
    ]
  },
  {
    title: "Application",
    url: "/app",
    icon: UsersRoundIcon
  },
  {
    title: "Domain",
    url: "/status",
    icon: Globe2Icon
  },
  {
    title: "Subscription",
    url: "/admin",
    icon: CreditCardIcon
  },
  {
    title: "Apps",
    url: "/workspace",
    icon: AppWindowIcon
  },
  {
    title: "Compliance",
    url: "/status",
    icon: RefreshCwIcon
  }
];

export const defaultSidebarBrand: SidebarBrand = {
  href: "/workspace",
  subtitle: "super-admin",
  title: "Super Admin Desk"
};

export const defaultSidebarUser: SidebarUser = {
  email: "user@codexsun.app",
  fallback: "U",
  name: "User"
};

export const defaultUserMenuItems: SidebarUserMenuItem[] = [
  {
    icon: SparklesIcon,
    title: "Upgrade to Pro"
  },
  {
    icon: BadgeCheckIcon,
    title: "Account"
  },
  {
    icon: AppWindowIcon,
    title: "Workspace"
  },
  {
    icon: MonitorCogIcon,
    title: "Notifications"
  },
  {
    icon: PanelsTopLeftIcon,
    title: "Super Admin login",
    url: "/sa"
  },
  {
    icon: LogOutIcon,
    title: "Log out",
    url: "/login"
  }
];

export function AppLayout({
  brand = defaultSidebarBrand,
  children,
  headerTitle = "Documents",
  homeHref = "/workspace",
  logoutHref = "/login",
  menuItems = defaultAppMenuItems,
  onLogout,
  subtitle,
  title,
  user = defaultSidebarUser,
  userMenuItems = defaultUserMenuItems,
  versionLabel = "v 1.0.1",
  workspaceItems = defaultWorkspaceItems,
  showPageTitle = true
}: AppLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem"
        } as CSSProperties
      }
    >
      <AppSidebar
        brand={brand}
        items={menuItems}
        user={user}
        userMenuItems={userMenuItems}
        variant="inset"
        versionLabel={versionLabel}
      />
      <SidebarInset>
        <TopMenu
          homeHref={homeHref}
          logoutHref={logoutHref}
          {...(onLogout ? { onLogout } : {})}
          pageTitle={String(headerTitle)}
          showPageTitle={showPageTitle}
          workspaceItems={workspaceItems}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {title || subtitle ? (
              <div className="border-b bg-background px-4 py-5 lg:px-6">
                {title ? (
                  <h2 className="m-0 text-2xl font-semibold leading-tight">{title}</h2>
                ) : null}
                {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
