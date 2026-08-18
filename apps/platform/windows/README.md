# CXApp Windows Host

CXApp Windows uses Tauri 2, Rust, React, SQLite, and the installed Microsoft Edge WebView2 runtime.
Rust owns the native lifecycle, navigation allowlist, safe workspace projection, diagnostics,
packaging, and signed updates. React remains the only product UI. Node.js is used for the cloud API
and frontend/build tooling; the installed desktop client does not run a permanent Node.js sidecar.

The current release is the tenant enrollment desktop host. It opens only
`https://app.codexsun.com/app/`, keeps Corporate ID mandatory through the shared cloud login, and
stores only a validated, non-secret one-workspace projection in
`%LOCALAPPDATA%\CXApp\Desktop\workspace.db`. It does not yet provide offline Billing. Module-owned
SQLite repositories and cloud synchronization contracts are still required before a Billing/Core
workflow can be described as offline-capable.

The desktop launcher also exposes a local MariaDB configuration surface. Its editable configuration
file is `%LOCALAPPDATA%\CXApp\Desktop\desktop-config.json`; it contains the runtime mode, MariaDB
host, port, database name, and database user. It intentionally does not contain a database password.
The launcher can save the file and test TCP reachability before the Local API is enabled.

One installation can hold one tenant workspace. A future tenant reset must clear SQLite, WebView2
state, device credentials, cached authorization, and unsynchronized work before another Corporate ID
is enrolled. Tenant secrets, passwords, cookies, JWTs, and database credentials must never enter the
desktop SQLite database.

## Commands

Run these commands from the repository root:

```powershell
npm run desktop:restore
npm run desktop:build
npm run desktop:run
npm run desktop:publish
npm run desktop:package
npm run desktop:install
npm run desktop:uninstall
```

The machine needs the Rust toolchain, Node.js/npm versions declared by the root package, Microsoft C++
Build Tools, and WebView2. Generated web, Cargo, bundle, and release output stays below root `dist/`.

`desktop:package` creates a current-user NSIS installer at
`dist/releases/windows/CXApp.Windows.Setup.exe`. `desktop:install` removes the superseded WinUI MSIX,
installs the Tauri client silently, and preserves `%LOCALAPPDATA%\CXApp\Desktop`. Uninstall also keeps
that local data by design.

## Signed updates and GitHub releases

The Tauri updater checks the stable GitHub `latest.json` endpoint. It accepts only artifacts signed
with the updater public key embedded in `tauri.conf.json`. Windows Authenticode signing remains a
separate trust layer for the installer.

The `windows-release.yml` workflow runs for a `v-<version>` tag that matches the lockstep repository
version. It validates the repository, tests and builds Rust, signs the NSIS installer, creates the
Tauri updater signature and `latest.json`, writes SHA-256 checksums, and publishes stable asset names.

Required GitHub repository secrets:

- `CXAPP_WINDOWS_SIGNING_PFX`
- `CXAPP_WINDOWS_SIGNING_PASSWORD`
- `CXAPP_TAURI_SIGNING_PRIVATE_KEY`
- `CXAPP_TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Keep both signing identities stable. Losing the Tauri updater private key or password prevents
existing installations from accepting future updates. The current local recovery copy is outside the
repository under `%USERPROFILE%\.cxapp\signing`; back it up in an approved secure vault before broad
distribution.

Release procedure:

1. Explicitly bump and validate the repository version.
2. Commit and push the release source.
3. Create and push `v-<version>`.
4. Confirm the Windows release workflow succeeds.
5. Run `Install-CXApp.ps1` from the release as administrator for the private signing certificate.

Version 1.0.62 remains the existing release baseline. The Tauri migration is recorded in that active
version until an explicit version-bump request creates the next tag.
