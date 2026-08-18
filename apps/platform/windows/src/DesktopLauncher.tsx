import { useCallback, useEffect, useState } from "react";
import {
  loadDesktopConfig,
  loadWorkspaceProjection,
  openWorkspace,
  saveDesktopConfig,
  testLocalDatabase,
  defaultDesktopConfig,
  type DesktopConfig,
  type WorkspaceProjection
} from "./desktop-api";

type LaunchState = "failed" | "opening" | "ready";

export function DesktopLauncher() {
  const [launchState, setLaunchState] = useState<LaunchState>("ready");
  const [message, setMessage] = useState("Choose a workspace action or open desktop settings.");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [config, setConfig] = useState<DesktopConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [testing, setTesting] = useState(false);

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
    void loadDesktopConfig()
      .then(setConfig)
      .catch(() => setConfig(defaultDesktopConfig));
  }, [launch]);

  async function saveConfig() {
    if (!config) return;
    setTesting(true);
    try {
      await saveDesktopConfig(config);
      await testLocalDatabase(config);
      setMessage("Local MariaDB is reachable. Restart CXApp to apply API changes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local MariaDB connection failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="launcher-shell">
      <section className="launcher-card" aria-live="polite">
        <div className="brand-mark" aria-hidden="true">
          CX
        </div>
        <p className="eyebrow">CODEXSUN</p>
        <h1>{launchState === "failed" ? "CXApp could not connect" : "CXApp Desktop"}</h1>
        <p className="message">{message}</p>

        {workspace && !showSettings ? (
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

        {showSettings && config ? (
          <div className="settings-panel">
            <label>
              Runtime mode
              <select
                value={config.apiMode}
                onChange={(event) =>
                  setConfig({ ...config, apiMode: event.target.value as DesktopConfig["apiMode"] })
                }
              >
                <option value="local">Local API + MariaDB</option>
                <option value="cloud">Cloud web</option>
              </select>
            </label>
            <label>
              MariaDB host
              <input
                value={config.databaseHost}
                onChange={(event) => setConfig({ ...config, databaseHost: event.target.value })}
              />
            </label>
            <label>
              MariaDB port
              <input
                type="number"
                value={config.databasePort}
                onChange={(event) =>
                  setConfig({ ...config, databasePort: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Database name
              <input
                value={config.databaseName}
                onChange={(event) => setConfig({ ...config, databaseName: event.target.value })}
              />
            </label>
            <label>
              Database user
              <input
                value={config.databaseUser}
                onChange={(event) => setConfig({ ...config, databaseUser: event.target.value })}
              />
            </label>
            <button type="button" disabled={testing} onClick={() => void saveConfig()}>
              {testing ? "Testing…" : "Save and test MariaDB"}
            </button>
          </div>
        ) : null}

        {launchState === "opening" && !showSettings ? (
          <span className="spinner" aria-label="Loading" />
        ) : null}
        {!showSettings ? (
          <button type="button" onClick={() => setShowSettings(true)}>
            Desktop settings
          </button>
        ) : (
          <button type="button" onClick={() => setShowSettings(false)}>
            Back to workspace
          </button>
        )}
        {launchState !== "opening" && !showSettings ? (
          <button type="button" onClick={() => void launch()}>
            {launchState === "failed" ? "Retry" : "Open workspace"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
