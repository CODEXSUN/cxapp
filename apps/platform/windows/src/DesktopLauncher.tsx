import { useCallback, useEffect, useState } from "react";
import { loadWorkspaceProjection, openWorkspace, type WorkspaceProjection } from "./desktop-api";

type LaunchState = "failed" | "opening" | "ready";

export function DesktopLauncher() {
  const [launchState, setLaunchState] = useState<LaunchState>("opening");
  const [message, setMessage] = useState("Preparing the secure desktop workspace…");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);

  const launch = useCallback(async () => {
    setLaunchState("opening");
    setMessage("Connecting securely to app.codexsun.com…");

    try {
      setWorkspace(await loadWorkspaceProjection());
      await openWorkspace();
      setLaunchState("ready");
      setMessage("The CXApp workspace is open.");
    } catch (error) {
      setLaunchState("failed");
      setMessage(error instanceof Error ? error.message : "CXApp could not open the workspace.");
    }
  }, []);

  useEffect(() => {
    void launch();
  }, [launch]);

  return (
    <main className="launcher-shell">
      <section className="launcher-card" aria-live="polite">
        <div className="brand-mark" aria-hidden="true">
          CX
        </div>
        <p className="eyebrow">CODEXSUN</p>
        <h1>{launchState === "failed" ? "CXApp could not connect" : "Opening CXApp"}</h1>
        <p className="message">{message}</p>

        {workspace ? (
          <dl className="workspace-summary">
            <div>
              <dt>Corporate ID</dt>
              <dd>{workspace.corporateId}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{workspace.companyName ?? workspace.tenantName}</dd>
            </div>
          </dl>
        ) : null}

        {launchState === "opening" ? <span className="spinner" aria-label="Loading" /> : null}
        {launchState !== "opening" ? (
          <button type="button" onClick={() => void launch()}>
            {launchState === "failed" ? "Retry" : "Open workspace"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
