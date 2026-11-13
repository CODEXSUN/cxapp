import { pickBackupFolder, saveBackupInFolder } from "./backup-local-files";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { Button } from "@cxapp/ui/components/button";
import { apiGet, apiPost } from "../../shared/api/platform-api";
type Profile = {
  id: string;
  label: string;
  host: string;
  port: number;
  allowRestore: boolean;
  allowExistingRestore: boolean;
  restoreTargets: Record<string, string[]>;
  masterDatabase: string;
  tenantDatabases: Record<string, string>;
};
type Config = {
  profiles: Profile[];
  locations: { id: string; label: string; path: string }[];
  tenants: { id: number; code: string; name: string; databaseName: string }[];
  format: string;
};
type Backup = {
  id: string;
  databaseName: string;
  tenantCode: string;
  createdAt: string;
  checksum: string;
  sizeBytes: number;
  profileId: string;
};
const fieldClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
export function MasterBackupsWorkspace() {
  return <DatabaseBackupsWorkspace scope="master" />;
}
export function TenantBackupsWorkspace() {
  const config = useQuery({
    queryKey: ["backup-config"],
    queryFn: () => apiGet<Config>("/admin/backups/config", "sa")
  });
  const fromUrl = () => new URLSearchParams(window.location.search).get("tenant") || "";
  const [selectedTenant, setSelectedTenant] = useState(fromUrl);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const sync = () => setSelectedTenant(fromUrl());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function openTenant(id: string) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("tenant", id);
    else url.searchParams.delete("tenant");
    window.history.pushState({}, "", url.pathname + url.search);
    setSelectedTenant(id);
  }
  const tenant = config.data?.tenants.find((t) => String(t.id) === selectedTenant);
  if (selectedTenant && tenant)
    return (
      <DatabaseBackupsWorkspace
        key={tenant.id}
        scope="tenant"
        lockedTenantId={String(tenant.id)}
        onBack={() => openTenant("")}
      />
    );
  const filtered =
    config.data?.tenants.filter((t) =>
      (t.name + " " + t.code + " " + t.databaseName).toLowerCase().includes(search.toLowerCase())
    ) || [];
  return (
    <WorkspacePage
      title="Tenant Backups"
      description="Select a tenant to manage its backups and restore options."
      technicalName="page.database.tenant-backup-list"
    >
      <div className="space-y-4 rounded-md border bg-card p-5">
        {config.error ? (
          <p role="alert" className="text-destructive">
            {config.error.message}
          </p>
        ) : null}
        {config.isLoading ? <p>Loading tenants…</p> : null}
        {selectedTenant && !config.isLoading ? (
          <p role="alert">
            Tenant was not found.{" "}
            <Button variant="outline" onClick={() => openTenant("")}>
              Back to tenants
            </Button>
          </p>
        ) : null}
        <Field label="Find tenant">
          <input
            className={fieldClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tenant name, code or database"
          />
        </Field>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Tenant</th>
                <th className="p-3">Code</th>
                <th className="p-3">Database</th>
                <th className="p-3">Backups</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b hover:bg-muted/50"
                  onClick={() => openTenant(String(t.id))}
                >
                  <td className="p-3">
                    <button className="font-medium underline-offset-4 hover:underline">
                      {t.name}
                    </button>
                  </td>
                  <td className="p-3">{t.code}</td>
                  <td className="p-3">{t.databaseName}</td>
                  <td className="p-3">Open backups →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!config.isLoading && !filtered.length ? <p>No matching tenants.</p> : null}
      </div>
    </WorkspacePage>
  );
}
function DatabaseBackupsWorkspace({
  scope,
  lockedTenantId = "",
  onBack
}: {
  scope: "master" | "tenant";
  lockedTenantId?: string;
  onBack?: () => void;
}) {
  const client = useQueryClient();
  const config = useQuery({
    queryKey: ["backup-config"],
    queryFn: () => apiGet<Config>("/admin/backups/config", "sa")
  });
  const [location, setLocation] = useState("");
  const [localFolder, setLocalFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [computerSelected, setSaveOnComputer] = useState(false);
  const saveOnComputer = scope === "tenant" && computerSelected;
  const [source, setSource] = useState("configured");
  const [destination, setDestination] = useState("");
  const tenantId = lockedTenantId;
  const [selected, setSelected] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [restoreMode, setRestoreMode] = useState<"new" | "fresh" | "incremental">("new");
  const confirmationText =
    (restoreMode === "fresh"
      ? "FRESH RESTORE "
      : restoreMode === "incremental"
        ? "MERGE RESTORE "
        : "RESTORE ") + databaseName;
  const [message, setMessage] = useState("");
  const locationId = location || config.data?.locations[0]?.id || "";
  const tenant = config.data?.tenants.find((t) => String(t.id) === tenantId);
  const destinationProfile = config.data?.profiles.find((p) => p.id === destination);
  const existingTargets = destinationProfile
    ? Array.from(
        new Set(
          [
            scope === "master"
              ? destinationProfile.masterDatabase
              : destinationProfile.tenantDatabases[tenant?.code || ""],
            ...(destinationProfile.restoreTargets?.[
              scope === "master" ? "master" : tenant?.code || ""
            ] || [])
          ].filter((name): name is string => !!name)
        )
      )
    : [];
  const listKey = ["backups", scope, locationId, tenant?.code || ""];
  const list = useQuery({
    queryKey: listKey,
    enabled: !!locationId && (scope === "master" || !!tenant),
    queryFn: () =>
      apiGet<Backup[]>(
        "/admin/backups?" +
          new URLSearchParams({ locationId, scope, tenantCode: tenant?.code || "" }),
        "sa"
      )
  });
  const action = useMutation({
    mutationFn: async (task: () => Promise<string>) => task(),
    onSuccess: async (text) => {
      setMessage(text);
      await client.invalidateQueries({ queryKey: ["backups"] });
    },
    onMutate: () => setMessage("")
  });
  const busy = action.isPending;
  const selectedBackup = list.data?.find((b) => b.id === selected);
  function chooseFolder() {
    try {
      const pending = pickBackupFolder();
      action.mutate(async () => {
        try {
          const folder = await pending;
          setLocalFolder(folder);
          setSaveOnComputer(true);
          return "Backup folder selected: " + folder.name;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError")
            return "Folder selection cancelled.";
          throw error;
        }
      });
    } catch (error) {
      action.mutate(async () => {
        throw error;
      });
    }
  }
  function exportBackup() {
    action.mutate(async () => {
      if (saveOnComputer && !localFolder)
        throw new Error("Choose a folder using Open folder first.");
      const backup = await apiPost<Backup & { sql?: string }>(
        "/admin/backups/export",
        {
          locationId,
          profileId: source,
          scope,
          downloadOnly: saveOnComputer,
          ...(tenant ? { tenantId: tenant.id } : {})
        },
        "sa"
      );
      if (saveOnComputer && localFolder) {
        const filename = backup.databaseName + "-" + backup.id + ".cxbackup";
        try {
          await saveBackupInFolder(localFolder, filename, backup);
        } catch {
          // Keep the completed backup available even if folder permissions changed.
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(backup)], { type: "application/json" })
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return "Could not write to the selected folder. The completed backup was sent to your browser downloads instead.";
        }
        return (
          "Backup saved in " +
          localFolder.name +
          "/" +
          filename +
          ". No backup file was stored on the database server. Upload this file below when you want to restore it."
        );
      }
      return "Backup saved. Download it below to keep a copy on your computer.";
    });
  }
  function download(id: string) {
    action.mutate(async () => {
      const artifact = await apiGet<unknown>(
        "/admin/backups/" + id + "?" + new URLSearchParams({ locationId }),
        "sa"
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(artifact)], { type: "application/json" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = id + ".cxbackup";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return "Backup downloaded.";
    });
  }
  function upload(file: File) {
    action.mutate(async () => {
      if (file.size > 40 * 1024 * 1024)
        throw new Error(
          "The upload limit is 40 MiB. Use native database tooling for larger backups."
        );
      const artifact: unknown = JSON.parse(await file.text());
      await apiPost(
        "/admin/backups/upload",
        { locationId, artifact, scope, tenantCode: tenant?.code || "" },
        "sa"
      );
      return "Backup uploaded and checksum checked. Select it below to restore.";
    });
  }
  function restore() {
    action.mutate(async () => {
      const result = await apiPost<{
        databaseName: string;
        tableCount: number;
        safetyBackupId?: string;
        inserted?: number;
        updated?: number;
      }>(
        "/admin/backups/restore",
        {
          locationId,
          id: selected,
          profileId: destination,
          databaseName,
          confirmation,
          mode: restoreMode,
          scope,
          tenantCode: tenant?.code || ""
        },
        "sa"
      );
      setConfirmation("");
      return (
        "Restored " +
        result.tableCount +
        " tables into " +
        result.databaseName +
        (restoreMode === "incremental"
          ? ". Inserted " + result.inserted + ", updated " + result.updated + "."
          : ".") +
        (result.safetyBackupId ? " Pre-restore backup: " + result.safetyBackupId + "." : "") +
        " Check the restored data before using it."
      );
    });
  }
  return (
    <WorkspacePage
      title={scope === "master" ? "Master Backups" : (tenant?.name || "Tenant") + " — Backups"}
      description="Save database copies and restore into a new or existing MariaDB database."
      technicalName={"page.database.backups." + scope}
    >
      <div className="space-y-5">
        {onBack ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={onBack} disabled={busy}>
              ← Back to tenants
            </Button>
            <p className="text-sm text-muted-foreground">
              Only {tenant?.code} backups and database mappings are available on this page.
            </p>
          </div>
        ) : null}
        {config.error ? (
          <p role="alert" className="text-destructive">
            {config.error.message}
          </p>
        ) : null}
        {config.isLoading ? <p>Loading backup connections…</p> : null}
        <section className="rounded-md border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Backup source and location</h2>
          <p className="text-sm text-muted-foreground">
            {scope === "master"
              ? "Choose a source connection and backup folder. Use Download below to save a copy on your computer."
              : "Choose a source connection, then save to a server folder or open a folder on your computer."}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {scope === "tenant" ? (
              <Field label="Tenant">
                <div className={fieldClass + " flex items-center"}>
                  {tenant?.name} ({tenant?.code})
                </div>
              </Field>
            ) : null}
            <Field label="Source connection">
              <select
                className={fieldClass}
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
              >
                {config.data?.profiles
                  .filter(
                    (p) =>
                      scope === "master" ||
                      p.id === "configured" ||
                      !!p.tenantDatabases[tenant?.code || ""]
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.host}:{p.port}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Backup location">
              <select
                className={fieldClass}
                value={saveOnComputer ? "__computer__" : locationId}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value === "__computer__") {
                    setSaveOnComputer(true);
                    return;
                  }
                  setSaveOnComputer(false);
                  setLocation(e.target.value);
                  setSelected("");
                }}
              >
                {scope === "tenant" ? (
                  <option value="__computer__">
                    {localFolder
                      ? "My computer — " + localFolder.name
                      : "My computer — choose folder"}
                  </option>
                ) : null}
                {config.data?.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            {scope === "tenant" ? (
              <div className="flex items-end">
                <Button variant="outline" onClick={chooseFolder} disabled={busy}>
                  Open folder
                </Button>
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground break-all">
            {saveOnComputer
              ? localFolder
                ? "Selected folder on your computer: " + localFolder.name
                : "Click Open folder to choose where to save."
              : config.data?.locations.find((l) => l.id === locationId)?.path}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.data?.format} Maximum SQL size: 32 MiB. A checksum confirms file integrity; it
            does not prove a successful restore.
          </p>
          <Button
            onClick={exportBackup}
            disabled={
              busy ||
              (!saveOnComputer && !locationId) ||
              (saveOnComputer && !localFolder) ||
              !config.data ||
              (scope === "tenant" && !tenant)
            }
          >
            Create backup
          </Button>
        </section>
        <section className="rounded-md border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Saved backups</h2>
            <Button
              variant="outline"
              disabled={busy || !locationId}
              onClick={() => void list.refetch()}
            >
              Refresh
            </Button>
          </div>
          <Field label="Upload a downloaded CXApp backup">
            <input
              type="file"
              accept=".cxbackup,application/json"
              disabled={busy || !locationId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </Field>
          {list.error ? (
            <p role="alert" className="text-destructive">
              {list.error.message}
            </p>
          ) : null}
          {list.isLoading ? <p>Loading backups…</p> : null}
          {!list.isLoading && !list.error && !list.data?.length ? (
            <p className="text-sm text-muted-foreground">
              {scope === "tenant" && !tenant
                ? "Select a tenant to view its backups."
                : "No backups in this location."}
            </p>
          ) : null}
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Select</th>
                  <th className="p-2">Database</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Copy</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="p-2">
                      <input
                        aria-label={"Select backup " + b.id}
                        type="radio"
                        name={"backup-" + scope}
                        checked={selected === b.id}
                        disabled={busy}
                        onChange={() => setSelected(b.id)}
                      />
                    </td>
                    <td className="p-2">
                      {b.databaseName}
                      <p className="text-xs text-muted-foreground">{b.profileId}</p>
                    </td>
                    <td className="p-2">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="p-2">{(b.sizeBytes / 1024).toFixed(1)} KiB</td>
                    <td className="p-2">
                      <Button variant="outline" disabled={busy} onClick={() => download(b.id)}>
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-md border bg-card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Restore to MariaDB</h2>
          <p className="text-sm text-muted-foreground">
            Restore a cloud copy locally, or a local copy to another enabled connection. The
            application connection stays read only here. Existing targets require explicit server
            permission. Fresh restore replaces all tables; incremental restore merges by primary key
            without deleting extra rows. Tenant routing stays unchanged.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Destination connection">
              <select
                className={fieldClass}
                value={destination}
                disabled={busy}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setConfirmation("");
                }}
              >
                <option value="">Select destination</option>
                {config.data?.profiles
                  .filter(
                    (p) =>
                      scope === "master" ||
                      !!p.tenantDatabases[tenant?.code || ""] ||
                      !!p.restoreTargets[tenant?.code || ""]?.length
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.allowRestore}>
                      {p.label}
                      {!p.allowRestore ? " (read only)" : ""}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Restore mode">
              <select
                className={fieldClass}
                value={restoreMode}
                disabled={busy}
                onChange={(e) => {
                  setRestoreMode(e.target.value as "new" | "fresh" | "incremental");
                  setConfirmation("");
                }}
              >
                <option value="new">New database</option>
                <option value="fresh">Fresh — replace existing tables</option>
                <option value="incremental">Incremental — merge rows</option>
              </select>
            </Field>
            <Field label={restoreMode === "new" ? "New database name" : "Existing database name"}>
              <input
                className={fieldClass}
                placeholder={
                  restoreMode === "new"
                    ? "cxrestore_tenant_20261113"
                    : existingTargets[0] || "Select an allowed database"
                }
                list={restoreMode === "new" ? undefined : "restore-targets-" + scope}
                value={databaseName}
                disabled={busy}
                onChange={(e) => {
                  setDatabaseName(e.target.value);
                  setConfirmation("");
                }}
              />
            </Field>
            <datalist id={"restore-targets-" + scope}>
              {existingTargets.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <Field label={"Type " + confirmationText}>
              <input
                className={fieldClass}
                value={confirmation}
                disabled={busy}
                autoComplete="off"
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">
            Selected backup:{" "}
            {selectedBackup
              ? selectedBackup.databaseName + " — " + selectedBackup.createdAt
              : "none"}
            . Existing restores save a pre-restore backup first. Stop application writes before
            restoring. Fresh restore can leave partial tables on failure; incremental errors roll
            back row changes.
          </p>
          {restoreMode !== "new" && destinationProfile?.allowExistingRestore ? (
            <p className="text-sm text-muted-foreground">
              Allowed databases: {existingTargets.join(", ") || "none configured"}.
              {databaseName && !existingTargets.includes(databaseName)
                ? " Choose one of these targets; the entered name is not allowed."
                : ""}
            </p>
          ) : null}
          {restoreMode !== "new" && !destinationProfile?.allowExistingRestore ? (
            <p className="text-sm text-muted-foreground">
              Enable existing restores for this destination in the server connection settings before
              continuing.
            </p>
          ) : null}
          <Button
            disabled={
              busy ||
              !selectedBackup ||
              !destinationProfile?.allowRestore ||
              !(restoreMode === "new"
                ? /^cxrestore_[a-zA-Z0-9_]{1,50}$/.test(databaseName)
                : /^[a-zA-Z0-9_]{1,64}$/.test(databaseName) &&
                  destinationProfile.allowExistingRestore &&
                  existingTargets.includes(databaseName)) ||
              confirmation !== confirmationText
            }
            onClick={restore}
          >
            {restoreMode === "fresh"
              ? "Fresh restore — replace tables"
              : restoreMode === "incremental"
                ? "Restore incremental rows"
                : "Restore into new database"}
          </Button>
        </section>
        {busy ? <p role="status">Working… Keep this page open.</p> : null}
        {action.error ? (
          <p role="alert" className="rounded-md border border-destructive p-4 text-destructive">
            {action.error.message}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-md border p-4">
            {message}
          </p>
        ) : null}
      </div>
    </WorkspacePage>
  );
}
