export type DesktopWorkspace = {
  companyId: number | null;
  companyName: string | null;
  corporateId: string;
  financialYearId: number | null;
  financialYearName: string | null;
  landingPage: string;
  tenantCode: string;
  tenantName: string;
  tenantUuid: string;
};

type WindowsWebView = {
  postMessage(message: string): void;
};

type DesktopWindow = Window & {
  __TAURI__?: {
    core?: {
      invoke(command: string, args?: Record<string, unknown>): Promise<unknown>;
    };
  };
  chrome?: {
    webview?: WindowsWebView;
  };
};

export function publishDesktopWorkspace(workspace: DesktopWorkspace): void {
  const desktopWindow = window as DesktopWindow;
  const tauriInvoke = desktopWindow.__TAURI__?.core?.invoke;
  if (tauriInvoke) {
    void tauriInvoke("save_workspace_projection", { workspace }).catch(() => undefined);
  }

  const webView = desktopWindow.chrome?.webview;
  if (!webView) return;

  webView.postMessage(
    JSON.stringify({
      payload: workspace,
      type: "cxapp.desktop.workspace",
      version: 1
    })
  );
}
