# Legacy Cutover

## Plan

- Cutover owner:
- Customer approver:
- Freeze start:
- Freeze end:
- Final import window:
- Rollback decision time:

## Steps

1. Confirm backup of old system.
2. Confirm CODEXSUN tenant backup.
3. Freeze or switch old app to read-only.
4. Run final import.
5. Run validation checks.
6. Verify critical screens with customer.
7. Enable CODEXSUN tenant for live use.
8. Keep old app read-only through sign-off.

## Conflict Rules

- Preserve legacy source id for every imported row.
- Report conflicts; do not silently overwrite.
- Do not hard-delete CODEXSUN data from legacy deletes.
- Use delta sync only with tenant-scoped logs and counts.
