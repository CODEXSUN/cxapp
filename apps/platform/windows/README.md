# CXApp Windows Host

The Windows product target is an offline-first WinUI 3 and .NET 10 shell. WebView2 will load packaged
React assets from a bundled Node.js loopback runtime backed by a tenant-bound SQLite database. The
cloud is the control plane, synchronization hub, backup projection, and auditor/back-office web.

The current source is the enrollment foundation only: it opens the canonical cloud workspace and
persists a safe one-row workspace projection after a verified tenant login. It does not yet provide
offline billing. Before release, the host must supervise the bundled local runtime and switch WebView2
to its authenticated loopback origin; module-owned SQLite repositories and cloud sync contracts must
then replace cloud-only business calls.

One installation can hold one tenant workspace. A tenant change must be an explicit reset that clears
SQLite, WebView2 state, device credentials, cached authorization, and unsynchronized work before new
Corporate ID enrollment. Tenant secrets, passwords, browser cookies, JWTs, and raw database
credentials must never be copied into SQLite.

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

The machine needs the .NET 10 SDK, a supported Windows SDK, and the Evergreen WebView2 Runtime. Build
and intermediate files are written only below the repository root `dist/` directory.

The current publish command creates an unpackaged, self-contained enrollment host for controlled
local testing. The package command creates the MSIX and App Installer release assets. This host is
still not the offline production client because the local runtime and module sync implementations
are not complete.

## Install and uninstall

`desktop:package` creates an unsigned local package in `dist/releases/windows`. Use an unsigned
package only to inspect and validate package contents. Windows requires a trusted signature for
normal installation and production distribution.

`desktop:install` installs the generated MSIX for the current user for local validation. Run the
install script with `-UseUpdateFeed`, or open the release `.appinstaller` file, for a production
installation that remains connected to the update feed. Windows Settings can remove the app. The
`desktop:uninstall` command performs the same current-user package removal. Uninstall keeps the local
application data by design. A future explicit tenant reset command will remove that data after it
checks for unsynchronized work.

## Automatic updates and GitHub releases

The `.appinstaller` file checks the latest GitHub release at each launch and also registers a
background update check. GitHub release assets use stable names so installed clients keep one update
feed URL.

The `windows-release.yml` workflow runs for a `v-<version>` tag. The tag must match the root package
version. The workflow validates the source, builds the host, signs the MSIX, writes SHA-256 checksums,
and creates the GitHub release.

Add these GitHub repository secrets before creating a release tag:

- `CXAPP_WINDOWS_SIGNING_PFX`: Base64 text for the production code-signing PFX.
- `CXAPP_WINDOWS_SIGNING_PASSWORD`: Password for that PFX.

The certificate subject becomes the package publisher. Keep that publisher subject unchanged across
certificate renewals. Windows will reject an update if the package identity or publisher changes.

The first private release uses a dedicated CODEXSUN sideloading certificate. Run `Install-CXApp.ps1`
from the GitHub release. The script requests administrator approval, validates the certificate,
trusts it for this Windows machine, and installs the App Installer feed. Replace this certificate
with a public code-signing certificate or Microsoft Trusted Signing before broad public distribution.

Release procedure:

1. Bump and validate the repository version.
2. Commit and push the release source.
3. Create and push `v-<version>`.
4. Check the Windows release workflow.
5. Install `CXApp.Windows.appinstaller` from the latest GitHub release.

Version `1.0.60` is the corrected first private Windows enrollment release. It uses the Windows App
SDK packaging target and includes the resource index and activation metadata required by WinUI and
WebView2. It writes bounded startup diagnostics to `%LOCALAPPDATA%\CXApp\Desktop\startup.log`. Do not
describe it as an offline billing release. The local runtime and module sync gates remain open.
