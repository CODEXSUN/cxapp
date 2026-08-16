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
  chrome?: {
    webview?: WindowsWebView;
  };
};

export function publishDesktopWorkspace(workspace: DesktopWorkspace): void {
  const webView = (window as DesktopWindow).chrome?.webview;
  if (!webView) return;

  webView.postMessage(
    JSON.stringify({
      payload: workspace,
      type: "cxapp.desktop.workspace",
      version: 1
    })
  );
}
