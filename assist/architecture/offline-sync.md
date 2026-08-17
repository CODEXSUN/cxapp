# Offline Sync

## Goal

Offline support allows users to continue business work when internet access is unstable and sync safely when connection returns.

## Windows Single-Client Contract

The Windows product is an offline-first, single-client installation. One installation is enrolled to
exactly one tenant. Its local database is the tenant isolation boundary and therefore does not accept
a caller-selected tenant override. Changing tenant requires an explicit reset that removes the local
database, WebView profile, device credential, pending outbox, and cached authorization before a new
Corporate ID can be enrolled.

The Windows runtime is composed as follows:

```text
Tauri 2/Rust host
  -> WebView2 with packaged React assets
  -> narrow typed Rust commands
  -> tenant-bound SQLite database
  -> outbound HTTPS synchronization to the Platform cloud API
```

Rust owns Windows lifecycle, secure device credential access, printing, files, hardware, SQLite
infrastructure, outbox, inbox, and synchronization transport. Node.js remains the cloud runtime and
frontend/build tool; it is not shipped as a permanent desktop sidecar. React remains the only product
UI. Every offline business repository and conflict rule remains owned by its Core or Billing module;
the Tauri bridge must not become a generic second business API.

The local API listens only on `127.0.0.1` on an ephemeral port. The host supplies a random per-launch
credential to both WebView2 and the child process. The runtime must reject other origins and callers.

## Cloud Contract

The cloud is the multi-tenant control plane, synchronization hub, backup projection, and auditor or
back-office web application. It owns tenant activation, plans, entitlements, device enrollment and
revocation, user and permission policy, and authoritative online-only services. Auditor screens read
the latest acknowledged cloud projection and must display the device's last synchronization time.

The cloud never opens a connection to a customer PC. A cloud change can notify a connected client,
but the client always performs the authenticated outbound pull. Polling remains the fallback.

## Data Authority

| Data                                                 | Authority                            | Offline behavior                                                                                |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Tenant activation, plan, entitlements, device status | Cloud                                | Signed cached lease with a bounded grace period                                                 |
| Users and permissions                                | Cloud                                | Previously enrolled users unlock locally through Windows Hello and a signed permission snapshot |
| Company, products, contacts, ledgers, settings       | Module policy                        | Read locally; writes use module conflict rules and the outbox                                   |
| Draft billing records                                | Local module                         | Create and edit offline, then synchronize                                                       |
| Confirmed financial records                          | Local module with reserved numbering | Append-only correction/reversal after confirmation                                              |
| e-Invoice, e-Way bill, external tax services         | Cloud/online service                 | Queue locally and clearly show pending online confirmation                                      |
| Auditor reports                                      | Cloud projection                     | Read-only and labelled with synchronization freshness                                           |

Cloud revocation takes effect on the next successful contact. The offline lease must expire after a
configured grace period so a revoked or unlicensed device cannot operate indefinitely without the
control plane. High-risk actions must require fresher authorization than ordinary data entry.

## Synchronization Protocol

Every offline-capable module owns its sync schema and conflict behavior. The shared transport only
moves typed module envelopes. Generic HTTP response caching or replaying arbitrary REST writes is
prohibited.

Local writes commit the business change, audit row, and outbox event in one SQLite transaction. Each
event carries tenant UUID, device UUID, user UUID, module, entity, public record UUID, local sequence,
base version, event UUID, idempotency key, timestamp, and schema version.

The worker uses this cycle:

1. Push ordered outbox batches and retain them until the cloud acknowledges each event UUID.
2. Pull cloud events after the last durable cursor.
3. Write the inbox envelope before applying it.
4. Apply module changes and advance the cursor in one transaction.
5. Record validation failures and conflicts without silently dropping either version.
6. Retry with exponential backoff and jitter.

Run an immediate cycle after a local commit and when connectivity returns. While active, poll about
every 30 seconds; while idle, poll about every five minutes. These are operational defaults, not a
correctness dependency.

SQLite uses WAL mode, foreign keys, ordered migrations, durable outbox/inbox tables, sync checkpoints,
conflict records, tombstones, and audit rows. SQLite is not a cache: it is the operational tenant
database for the Windows client.

## Offline Clients

Offline support may be required for:

- Tauri 2 desktop host with WebView2.
- Capacitor mobile host.
- Browser app with limited offline capability.

## Offline Data Categories

### Reference Data

Mostly read-only data needed for work.

Examples:

- Customers.
- Items.
- Tax rates.
- Price lists.
- Ledgers.
- Settings.

### Transaction Data

Business records created or edited offline.

Examples:

- POS bills.
- Orders.
- Receipts.
- Stock movements.
- Tasks.

### Restricted Data

Data that may need online confirmation.

Examples:

- e-Invoice generation.
- e-Way bill generation.
- Final accounting closure.
- Subscription activation.
- User permission changes.

## Sync States

Records should clearly track sync state:

- Draft.
- Pending sync.
- Syncing.
- Synced.
- Failed.
- Conflict.
- Resolved.

## Conflict Strategy

Each module must define conflict behavior.

Possible strategies:

- Last write wins for low-risk records.
- Manual review for accounting and inventory conflicts.
- Server-authoritative for compliance records.
- Merge rules for notes, tasks, and activity logs.
- Temporary local numbers converted to server numbers after sync.

## Offline Numbering

Offline billing and transaction numbering needs special care.

Options:

- Temporary local numbers.
- Reserved number ranges.
- Device-specific prefixes.
- Server finalization after sync.

Compliance documents should not receive final legal numbers until rules are satisfied.

The Windows client must reserve company, financial-year, document-type, and device-specific number
ranges while online. It may confirm legal documents offline only while a valid unused range exists.
After exhaustion it may save drafts, but it must not invent a final number. The cloud rejects reused
ranges and duplicate idempotency keys.

## Sync Audit

Sync must record:

- Device ID.
- User ID.
- Tenant ID.
- Record type.
- Record ID.
- Local timestamp.
- Server timestamp.
- Sync result.
- Conflict reason.
- Resolution action.

## Current Delivery Gap

The existing MariaDB repositories and cloud cookie session cannot be treated as an SQLite/offline
implementation. Production delivery still requires module-owned SQLite repositories, device
enrollment and Windows Hello unlock, signed offline authorization leases, cloud push/pull routes,
change capture, number-range allocation, file synchronization, conflict UI, recovery, and restart and
two-device tests. Each Billing/Core module must be promoted individually; a generic offline proxy is
not an acceptable shortcut.
