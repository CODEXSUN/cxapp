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
Opening migration, export settlement, collection tools, and full release audit remain pending.
Statement ageing is included in version 1.0.78. Deployment and browser print verification are not included.
