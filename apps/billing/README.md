# Billing outstanding workflow

## Scope

Billing entries and client outstanding only. Accounts and Stock are excluded.
Manual quotation conversion links an existing invoice without changing its items.

## Tasks and acceptance checks

- [ ] Company/FY opening balances: add an owned table with contact, company, financial year, signed balance, currency, source, and audit history.
      Save validates scope and parents. Enforce one opening per party and scope.
      Preview legacy openings before explicit assignment. Do not copy them into multiple scopes.
      Test repeated import, fresh schema, existing-data upgrade, rollback, and unchanged invoice totals.
- [ ] Export settlement: add a separate export allocation relation to Receipt without rewriting existing domestic allocations.
      Save locks invoices in stable order, validates customer/currency/scope, and rejects over-allocation.
      Test domestic, export, mixed, partial, repeat, concurrent, cancelled, and deleted flows.
- [ ] Reserved/settled reporting: expose draft reservations, posted settlements, and available-to-allocate separately.
      Outstanding includes posted vouchers only. Draft reservations do not reduce the financial balance.
- [ ] Collection tools: add nullable due dates, advances, and reason-required audited Billing adjustments.
      Existing dates remain unchanged. Use document-date ageing until due dates are available.
- [ ] Statement ageing: calculate from all confirmed invoices and posted settlements through the statement To date.
      Honor explicit allocations first. Apply remaining credits to undated opening then oldest invoices for report purposes only.
      Show 0–30, 31–60, 61–90, and 91+ days, undated opening, credit balance, and draft reservations.
      Print once after all statement movements. Buckets less credit balance must equal closing balance.
- [ ] Release audit: fix the existing quotation E2E fixture. Test two tenants, two companies, two years, persistence, and complete printing.

## Migration gate

Legacy contact openings have no company/FY ownership. Assignment requires a user choice.
Keep legacy values unchanged until an explicit reviewed migration records their target scope.
Do not release a destructive migration or switch report sources before reconciliation.

## Verification status

Statement ageing is implemented in both report APIs and at the end of both print layouts.
Customer live-data checks passed for three contacts, including reconciliation and pagination independence.
Supplier calculation tests passed. The local fixture has no supplier contacts, so live supplier coverage remains pending.
Billing API/web builds, lint, boundary checks, and ageing boundary tests passed.
Browser print verification is blocked by an unresponsive in-app browser tab.
Opening migration and export settlement are implemented locally. Collection tools and the full release audit remain pending.
The export-settlement preparation audit found missing currency checks in domestic receipt/payment allocations.
Validation and locked save queries now require matching invoice currency. Existing allocations are not rewritten.
Live cross-currency rejection and export allocation coverage remain pending.
Receipt and Payment candidate responses now include currency. Forms limit candidates to the selected party and entry currency.
Edit forms add back only their own active reservation. Cancelled entries do not add a reservation.
Party changes no longer restore the original party's allocations in the candidate list.
Owner tests cover currency, party changes, partial reservations, fully reserved invoices, and cancelled entries.
Statement ageing is included in version 1.0.78. Deployment and browser print verification are not included.

## Repeatable test suite

Run `npm run test:billing` for calculation, conversion validation, and allocation candidate unit tests.
Run `npm run test:billing -- --database` to add isolated MariaDB allocation and quotation workflow tests.
Database tests use root environment connection settings. They create disposable databases and remove only their own databases.
They do not use or certify production customer data. Browser and physical print checks are separate.

## Audit results, October 1, 2026

- Passed 13 unit tests, including 600 deterministic ageing scenarios and exact bucket boundaries.
- Passed isolated MariaDB allocation guards, transaction rollback, and linked-invoice identity protection.
- Passed quotation creation, address reactivity, automatic conversion, retry rejection, and concurrent duplicate prevention.
- Passed manual existing-invoice linking and repeat linking without creating an invoice or changing invoice fields/items.
- Passed receipt currency rejection, duplicate allocation rejection, draft reservation, over-allocation rejection, and cancellation release.
- Passed company/FY isolation in the quotation fixture. Two-tenant database and browser isolation proof remains pending.
- Fixed the quotation test harness: await the scoped workflow before database cleanup. No application schema migration changed.
- Export allocation persistence and scoped opening balances are implemented locally. Due dates and audited adjustments remain unimplemented.
- Full reserved/settled reporting, restart persistence, and complete browser print verification remain incomplete.
- Currency allocation checks pass, but statement totals still require a separate multi-currency reporting audit.
- Workspace checks and eight migration-contract tests passed. These do not certify a restored production-data migration.
- The full root production build passed on a sequential rerun after a concurrent `dist` cleanup collision.

The implemented regression suite passes. The full task plan is not complete and is not certified for production.

Cancelled Receipt and Payment edit forms now use only current allocation candidates.
They no longer restore fully settled invoices as zero-balance candidates from old allocations.
Regression checks cover this case. The 13 unit tests and both isolated database stages passed again.
No cloud database migration was run.

## Export settlement and scoped openings implementation

Receipt now supports domestic and export invoice allocations, including mixed receipts in the same currency.
Separate additive tables preserve domestic allocation rows. Active reservations protect export invoices from edits and cancellation.
Receipt writes lock the current status to reject stale concurrent transitions.

Billing Settings includes an Opening balances tab in both settings entry points.
Admin can save a signed opening for a contact, party role, company, and financial year, with a required reason.
Each save records an audit activity. Reviewed legacy assignment records ownership without changing the contact value.
Assigned legacy amounts are not reused in other scopes. Explicit zero openings override legacy amounts.
Opening balances currently support INR only; foreign-currency reporting requires a separate design and reconciliation audit.
The opening-balance leaf uses a reduced configuration lifecycle: no deletion, queue, worker, or sync capability.

The billing suite passed again with 13 unit tests and both isolated database stages after these changes.
Database coverage includes mixed export allocation hydration, over-allocation rejection, cancellation release,
migration rerun preservation, Admin-only opening writes, explicit zero overrides, and unchanged legacy contact values.
Browser verification is incomplete: the local server on port 7020 is not running.
Restored-production upgrade, cross-tenant runtime, full export concurrency, and browser printing remain release gates.
Version 1.0.79 records this implementation. No production migration or deployment is included.

Statement tables and prints show bill age as elapsed calendar days from the bill date to today, formatted as `62 d`.
Receipt and Payment movements show a dash instead of bill age. Future bill dates show zero days.
Print layouts use centered headings and no longer show the separate outstanding ageing summary block.
The backend ageing calculation remains unchanged. Chrome verified the customer rows at 62 and 44 days on October 1, 2026.
