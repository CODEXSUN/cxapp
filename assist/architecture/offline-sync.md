# Offline Sync

## Goal

Offline support allows users to continue business work when internet access is unstable and sync safely when connection returns.

## Offline Clients

Offline support may be required for:

- Electron desktop app.
- React Native mobile app.
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
