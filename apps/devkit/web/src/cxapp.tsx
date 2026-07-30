import type { SidemenuItem } from "@cxapp/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@cxapp/ui/blocks/menu/sidemenu/top-menu";
import { DatabaseIcon, WrenchIcon } from "lucide-react";
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";

export type DevkitWorkspaceContribution = {
  component: LazyExoticComponent<ComponentType>;
  group: string;
  id: string;
  title: string;
};

const workspace = (
  id: string,
  title: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): DevkitWorkspaceContribution => ({
  component: lazy(load),
  group,
  id,
  title
});

const workspaces = Object.freeze([
  workspace("registry", "Platform Registry", "Development", () =>
    import("./modules/platform-registry").then((module) => ({
      default: module.PlatformRegistryWorkspace
    }))
  )
]);

export const devkitWebBundle = Object.freeze({
  id: "devkit",
  rootPath: "/app/devkit",
  title: "DevKit",
  version: "1.0.54",
  workspaces,
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Platform application and module registry.",
      icon: WrenchIcon,
      title: "DevKit",
      url: "/app/devkit/registry"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: DatabaseIcon,
        isActive: activeWorkspaceId === "registry",
        title: "Platform Registry",
        url: "/app/devkit/registry"
      }
    ];
  },
  resolveWorkspace(pathname: string): DevkitWorkspaceContribution | undefined {
    const [surface, packageId, section = "registry"] = pathname.split("/").filter(Boolean);
    if (surface !== "app" || packageId !== "devkit") return undefined;
    return workspaces.find((entry) => entry.id === section);
  }
});

export function DevkitWorkspaceHost({ workspaceId }: { workspaceId: string }) {
  const contribution = workspaces.find((entry) => entry.id === workspaceId);
  if (!contribution) return null;
  const Workspace = contribution.component;
  return (
    <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
      <Workspace />
    </Suspense>
  );
}
