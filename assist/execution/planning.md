# CODEXSUN Billing, Accounting, Compliance, and Business Services Plan

## Purpose

This document consolidates the product opportunities identified from the current CODEXSUN repository and the related
client-service discussion. It is a planning document, not a statement that every listed capability is implemented.

Last reviewed: 2026-07-17.

Batch reference: #35.

The plan concentrates on Billing, Accounting, GST and other business services that can attract and retain Indian SME
clients.

## Product Direction

CODEXSUN should be presented as a business operations platform, not only as invoice software.

The primary customer promise is:

> CODEXSUN helps a business create bills, keep books, control compliance, collect money, control stock, manage staff,
> and understand profit.

The core commercial experience should be divided into three connected desks:

1. **Billing Desk** - create, issue, print, share, and collect against business documents.
2. **Books Desk** - post, reconcile, review, and close accounts.
3. **GST Desk** - verify transactions, resolve mismatches, prepare returns, and retain compliance evidence.

Additional service desks can extend this foundation into collections, virtual CFO, payroll, inventory, sales, finance,
industry operations, and managed back-office services.

## Current Repository Position

The live repository is ahead of `assist/documentation/project-inventory.md`, which still describes Sales as the only
Billing module. The filesystem must be treated as the source of truth until that inventory is updated.

### Current Billing capabilities

The Billing application currently contains:

- Sales
- Export sales
- Purchases
- Quotations
- Receipts
- Payments
- Billing and document settings
- Billing dashboard
- Customer statement API and frontend work
- Supplier statement API
- GST statement API
- Stock statement API

Current behavior includes:

- Draft, confirm or post, cancel, revoke, and controlled deletion workflows where supported.
- Quotation-to-sales conversion.
- Purchase-to-sales conversion where supported by the current workflow.
- Receipt allocation against customer sales.
- Payment allocation against supplier purchases.
- CGST/SGST and IGST calculations.
- HSN, tax, unit, size, colour, PO, and DC line information.
- e-Invoice and e-Way Bill integration through WhiteBooks for supported sales flows.
- Tenant-specific document numbering.
- Invoice titles, letterhead, logo, bank details, QR details, terms, and print settings.
- Sales, purchase, receipt, and payment metrics.
- Outstanding customer and supplier information.
- Tenant-database isolation and permission checks.

### Current Core foundations used by Billing

Core supplies important business masters:

- Companies, default company, and financial years.
- Ledger groups and ledgers.
- Contacts and contact-related masters.
- Products, HSN codes, GST taxes, units, sizes, colours, styles, brands, groups, categories, and types.
- Currencies, payment terms, sales types, priorities, and months.
- Warehouses, transports, destinations, work-order types, and work orders.

### Current readiness observations

- Billing has a strong transaction-entry foundation but is not yet a complete bookkeeping and accounting system.
- Credit notes, debit notes, journals, contra vouchers, full ledger posting, bank reconciliation, trial balance, profit and
  loss, and balance sheet are not present as completed owned modules.
- GSTR-1, GSTR-3B, GSTR-2B, IMS, GSTR-9, and GSTR-9C workflows are not present as complete owned modules.
- Some dashboard and report work is uncommitted active work and should not be marketed as released until verified.
- The app-scoped Billing boundary check currently treats the `reports` composition folder as a full module and reports
  missing role files. The reporting composition and leaf ownership must be corrected before Billing is declared final.
- Runtime, database, browser, and production verification must be completed before any capability is sold as production
  ready.

## Primary Billing and Accounting Roadmap

### 1. GST Compliance Cockpit

Build a monthly compliance workspace with:

- GSTR-1 preparation and table-wise validation.
- GSTR-3B liability and input-tax-credit working.
- GSTR-1 versus GSTR-3B reconciliation.
- GSTR-2B import and purchase-register matching.
- Invoice Management System accept, reject, and pending decisions.
- Missing-in-2B, amount mismatch, GSTIN mismatch, tax mismatch, and duplicate queues.
- Vendor follow-up for missing or incorrect invoices.
- Return filing status, ARN, acknowledgements, and filing history.
- Compliance calendar and deadline alerts.
- GSTR-9 and GSTR-9C reconciliation working papers.
- Permission-controlled Excel, JSON, PDF, and CA-review exports.
- e-Invoice time-limit monitoring and rejection-risk alerts.

The customer promise should be: **Find GST problems before filing or receiving a notice.**

### 2. Automated Bookkeeping

Add independently owned accounting modules for:

- Journal vouchers.
- Contra vouchers.
- Sales and purchase accounting postings.
- Credit notes and debit notes.
- Expense entries.
- Opening balances.
- Bank statement import.
- Bank reconciliation.
- Rule-based transaction matching and categorisation.
- Cash book and bank book.
- Day book and general ledger.
- Trial balance.
- Profit and loss.
- Balance sheet.
- Cash-flow statement.
- Period closing and financial-year locking.

The customer promise should be: **Enter a business document once; CODEXSUN completes the books automatically.**

### 3. Sales and Purchase Audit Centre

Create an exception-driven audit workspace that identifies:

- Missing, duplicate, backdated, or future-dated invoice numbers.
- Invoice-sequence gaps.
- Duplicate supplier invoices.
- Invalid or inconsistent GSTIN and place-of-supply information.
- Incorrect CGST/SGST versus IGST selection.
- HSN and tax-rate inconsistencies.
- Sales without receipts and purchases without payments.
- Purchases missing from GSTR-2B.
- Documents changed after confirmation or posting.
- Negative stock and billing without sufficient stock.
- Unusual discounts, round-off, manual tax changes, and rate overrides.
- Related-party or repeated high-value transactions.
- Documents entered after period lock.

Every exception should support:

- Owner assignment.
- Comments and attachments.
- Open, investigating, resolved, accepted-risk, and reopened states.
- Evidence history.
- Reviewer and auditor sign-off.
- Immutable before-and-after values for financial changes.

### 4. Receivable and Payable Control

Add:

- Customer and supplier ageing.
- Due-date and overdue buckets.
- Automated WhatsApp, email, and in-app reminders.
- Promise-to-pay tracking.
- Payment links and invoice QR codes.
- Collection-agent assignment.
- Unallocated receipt and payment matching.
- Customer credit-limit blocking or approval.
- Collection forecasts.
- Customer self-service payment portal.
- Vendor payment planning.
- Configurable overdue-interest calculations.
- MSME delayed-payment evidence and escalation preparation.

The customer promise should be: **Know whom to call, what is overdue, and when money is expected.**

### 5. Purchase Automation

Add:

- Supplier invoice OCR.
- Email and PDF purchase inbox.
- Purchase orders.
- Goods receipt notes.
- Delivery challans.
- PO, GRN, and supplier-invoice three-way matching.
- Supplier statement reconciliation.
- Reverse-charge identification and liability working.
- ITC eligibility and blocking rules.
- MSME payment-age monitoring.
- Expense and purchase approval workflows.

### 6. Complete Commercial Documents

Complete the billing cycle with:

- Credit notes.
- Debit notes.
- Sales returns.
- Purchase returns.
- Proforma invoices.
- Delivery challans.
- Advance receipts and adjustments.
- Recurring invoices.
- Subscription and service billing.
- Partial delivery and partial invoicing.
- Multi-currency gain and loss treatment.
- TDS and TCS handling.

## High-Value Differentiators

After the accounting and compliance foundation is stable, add:

- A CA and accountant portal for multiple client organisations.
- Maker-checker approvals and configurable financial controls.
- Complete activity history with before-and-after financial values.
- Tally and Excel migration tools.
- GST Health Score with actionable issues.
- Monthly-close checklist and evidence pack.
- Profitability by invoice, customer, supplier, product, salesperson, branch, and warehouse.
- Garments-specific size and colour profitability.
- Multi-company, multi-branch, and warehouse reporting.
- Controlled offline billing and financial synchronisation.
- Local-language invoice templates and communications.
- Permission-aware ZERO assistance for business questions and recommended actions.

Example ZERO questions:

- Which customers should we call for payment today?
- Which purchases are missing from GSTR-2B?
- Why is this month's gross margin lower?
- Which products are slow-moving?
- Which vendors repeatedly submit incorrect invoices?

AI results must be permission-aware, auditable, and labelled as estimates where applicable. AI-generated financial or
compliance actions require user confirmation.

## Additional Client Services Beyond Billing and GST

### 1. Payment Collection Service

Offer a managed collection service using CODEXSUN:

- Automated reminders.
- Follow-up queues.
- Promise-to-pay records.
- Escalation letters.
- Customer statement sharing.
- Collection-agent activity.
- MSME delayed-payment documentation.
- Samadhaan or dispute-preparation evidence packs where applicable.

This service has a direct and easily demonstrated benefit: improved cash collection.

### 2. Virtual CFO and Monthly MIS

Provide a monthly management service containing:

- Profit and loss review.
- Cash-flow forecast.
- Expense-leakage report.
- Customer and product profitability.
- Working-capital analysis.
- Break-even calculation.
- Budget versus actual.
- Owner dashboard.
- Monthly management-review call.

The customer-facing message should be: **We show where money is earned, blocked, and lost.**

### 3. Loan Readiness and Working Capital

Offer:

- Clean books and financial statements.
- Debtor and creditor ageing.
- Stock statements.
- Cash-flow projections.
- CMA-style working papers.
- Loan-document checklists.
- Receivable-financing readiness.
- TReDS invoice preparation and tracking where applicable.

### 4. Payroll and Employee Compliance

Create a separately owned Payroll area for:

- Attendance and shifts.
- Salary processing.
- Payslips.
- Employee advances and loans.
- Expense reimbursements.
- Leave management.
- PF, ESI, and professional-tax working.
- Salary TDS.
- Contractor payments.
- Full-and-final settlements.

Payroll is suitable for recurring monthly service revenue.

### 5. TDS and Income-Tax Compliance

Offer:

- TDS determination and calculation.
- Deduction alerts.
- Challan tracking.
- Quarterly-return preparation.
- Vendor PAN validation.
- Lower-deduction certificate tracking.
- Form 16 and Form 16A records.
- Advance-tax working.
- Income-tax document collection.

This must be an independently owned compliance area because statutory rules, thresholds, and return formats change.

### 6. Inventory Control Service

Offer businesses a Stock Accuracy Program:

- Physical-stock verification.
- Barcode and label setup.
- Batch and expiry tracking.
- Minimum-stock alerts.
- Dead-stock identification.
- Fast- and slow-moving analysis.
- Warehouse transfers.
- Stock valuation.
- Purchase recommendations.
- Negative-stock audits.
- Inventory profitability.

This service is particularly relevant to garments, retail, trading, distribution, printing, and manufacturing clients.

### 7. Sales CRM and Follow-Up

Extend quotation into a lead-to-cash flow:

- Lead capture.
- Enquiry management.
- Quotation follow-up.
- Sales pipeline.
- Follow-up reminders.
- Lost-order reasons.
- Salesperson targets.
- Customer-visit tracking.
- Quotation-to-order conversion.
- Renewal reminders.

### 8. Industry Operations Packs

Package industry-specific solutions rather than presenting a generic ERP:

- **Garments:** size and colour matrix, job work, cutting, stitching, wastage, and profitability.
- **Printing:** estimates, paper calculations, plates, job tracking, costing, and delivery.
- **uPVC:** measurements, quotations, cutting optimisation, fabrication, and installation.
- **Services:** timesheets, retainers, milestones, expenses, and recurring invoices.
- **Distribution:** salesperson routes, schemes, van sales, collections, and dealer controls.
- **Manufacturing:** BOM, production orders, material issue, output, wastage, and costing.
- **Retail/POS:** counter billing, barcode, offers, loyalty, returns, and offline operation.

Each industry capability must identify and remain inside its owning industry pack.

### 9. Digital Commerce Service

Offer:

- Product catalogues.
- Customer ordering portals.
- WhatsApp ordering.
- Dealer portals.
- Online payments.
- Courier integration.
- Marketplace order imports.
- Marketplace settlement reconciliation.
- ONDC readiness through approved participant integrations.
- Returns and refund tracking.

### 10. Document and Office Automation

Offer:

- Tenant-scoped digital document vaults.
- Invoice and purchase-document OCR.
- Approval workflows.
- Expense claims.
- E-sign integration.
- Contract-expiry reminders.
- Licence and insurance reminders.
- Employee, customer, and vendor document collection.
- Automatic filing by company and financial year.

### 11. Business Setup and Migration

Use onboarding as a sellable service:

- Tally migration.
- Excel migration.
- Customer, supplier, ledger, and product cleanup.
- Opening-balance migration.
- GST and ledger mapping.
- Invoice-template design.
- Barcode setup.
- User, role, and permission configuration.
- Staff training.
- Historical-data validation.

Migration can be included or discounted with an annual subscription.

### 12. Managed Back Office

Operate CODEXSUN for clients who do not have trained internal staff:

- Daily sales and purchase entry.
- Bank reconciliation.
- Document collection.
- Customer follow-up.
- Vendor reconciliation.
- Payroll processing.
- Monthly closing.
- Compliance preparation.
- Owner reporting.
- Dedicated account manager.

## Commercial Packages

| Package         | Customer promise                          | Primary capabilities                                                        |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Starter Billing | Professional GST billing quickly          | Sales, purchase, quotation, receipt, payment, and print                     |
| Smart Books     | Accounts update from business documents   | Posting, vouchers, reconciliation, and financial reports                    |
| GST Control     | File with fewer mismatches                | GSTR-1, GSTR-3B, GSTR-2B, IMS, reconciliation, and calendar                 |
| Audit Pro       | Find errors before filing or review       | Sales/purchase audit, approvals, locks, and audit trail                     |
| Collections Pro | Collect receivables faster                | Ageing, reminders, promises, links, assignments, and forecasts              |
| CFO Desk        | Understand cash, profit, and risk         | MIS, forecasts, budgets, profitability, and monthly review                  |
| Payroll Desk    | Complete monthly employee processing      | Attendance, payroll, deductions, payslips, and compliance working           |
| Industry Pro    | Software shaped for the client's business | Garments, service, printing, uPVC, distribution, manufacturing, or POS pack |
| Managed Office  | CODEXSUN operated for the client          | Data entry, reconciliation, closing, compliance preparation, and reporting  |

Every paid package must connect to Plan Access and tenant-specific Entitlements. Tenant Access must display the effective
result before release.

## Recommended Launch Sequence

### Foundation sequence

1. Credit notes, debit notes, and accounting-posting foundation.
2. Journal, contra, expense, and opening-balance modules.
3. Bank import and reconciliation.
4. Receivable and payable ageing, reminders, and promise-to-pay.
5. GSTR-1 and GSTR-3B working.
6. GSTR-2B and IMS reconciliation.
7. Sales and purchase audit centre.
8. Trial balance, profit and loss, balance sheet, and cash flow.
9. CA multi-client portal and GST Health Score.
10. OCR and automated bookkeeping.
11. Industry-specific packs.

### Services to launch first

The first services should be those that are easy for customers to understand and can produce recurring revenue:

1. Payment Collection and Receivable Recovery.
2. Virtual CFO and Monthly MIS.
3. Payroll Processing.
4. Inventory Audit and Control.
5. Business Migration and Managed Back Office.

## Client Acquisition Offers

Use low-friction entry offers to demonstrate value:

- Free Business Health Check.
- Free GST mismatch summary from sample exports.
- Free receivable-ageing and collection-priority report.
- Free invoice-template design with annual subscription.
- Discounted Tally or Excel migration.
- Fixed-price first monthly close.
- Seven-day stock and profitability review.
- Guided trial using the client's own sample data with explicit consent and tenant isolation.

The Business Health Check can cover:

- Outstanding payments.
- GST mismatches.
- Stock issues.
- Expense leakage.
- Invoice-sequence problems.
- Customer and product profitability.
- Missing documents.
- Immediate corrective actions.

## Positioning Messages

Primary message:

> CODEXSUN does not only create invoices. We help you collect money, control stock, manage staff, maintain compliance,
> and understand profit.

Supporting messages:

- Create once; books update automatically.
- Find GST problems before filing.
- Know whom to call for payment today.
- Close the month with evidence, not guesswork.
- Start small and activate more as the business grows.
- Use an industry workflow instead of forcing the business into generic ERP screens.

## Product and Architecture Ownership

This plan must follow CODEXSUN's module-owned architecture.

### Billing ownership

Billing should own commercial documents and their direct lifecycle:

- Quotation.
- Sales.
- Export sales.
- Purchase.
- Credit note.
- Debit note.
- Sales return.
- Purchase return.
- Delivery challan.
- Receipt.
- Payment.
- Recurring invoice.

### Accounting ownership

Accounting should independently own:

- Posting rules and posting records.
- Journal and contra vouchers.
- Expenses.
- Opening balances.
- Bank statements and reconciliation.
- Cash book, bank book, day book, and general ledger.
- Trial balance, profit and loss, balance sheet, and cash flow.
- Period close and financial locks.

Billing may publish approved events or use a fixed public application contract to request accounting posts. Billing must
not write Accounting's private tables directly.

### Compliance ownership

GST and other compliance modules should independently own:

- Return periods.
- GSTR-1 working.
- GSTR-3B working.
- GSTR-2B imports.
- IMS decisions.
- Reconciliation cases.
- Filing artefacts and acknowledgements.
- Annual-return and GSTR-9C working papers.
- Compliance calendars and evidence.

Compliance may consume Billing and Accounting data through fixed public contracts, approved read models, exports, or
events. It must not import sibling private repositories or services.

### Reporting ownership

Cross-domain reports must use approved reporting read models or public contracts. A report leaf owns its exact query,
filters, response, frontend types, form, list, and workspace. A parent `reports` folder is composition only and must not be
misrepresented as a full business module.

### Asynchronous and integration behavior

- Filing, OCR, imports, exports, message delivery, external APIs, and long-running reconciliations must use executable
  queue jobs.
- Jobs and events must carry tenant context, correlation ID, source module, retry policy, and masked operator-visible
  details.
- External credentials must be encrypted.
- Integration calls must be logged and safely retryable.
- Webhooks must be authenticated.
- WhatsApp, email, payment, finance, and filing actions must respect permission and tenant policy.

## Compliance Wording and Review Rule

Do not market the general service as a mandatory statutory **GST audit** without checking the applicable law and client
facts. Prefer:

- GST reconciliation.
- Annual-return review.
- GSTR-9 and GSTR-9C working papers.
- GST compliance health check.
- Sales and purchase transaction audit.
- Audit evidence and exception management.

As of this document's review date, GSTR-9C is a self-certified reconciliation statement for applicable taxpayers rather
than the earlier general statutory GST audit model. Thresholds, due dates, return forms, e-Invoice rules, TDS rules, and
portal behavior are time-sensitive and must be verified against current official sources before implementation or client
advice.

Useful official references:

- GST Portal returns guidance: <https://tutorial.gst.gov.in/userguide/returns/index.htm>
- GST Invoice Management System FAQ:
  <https://tutorial.gst.gov.in/downloads/news/final_faqs_on_ims_22_09_2024.pdf>
- GST liability and ITC comparison guidance:
  <https://tutorial.gst.gov.in/userguide/inputtaxcredit/FAQs_comparison_of_liability_declared_and_ITC_claimed.htm>
- CBIC Circular 246/03/2025-GST:
  <https://cbic-gst.gov.in/pdf/cir-cgst-246-03-2025.pdf>
- RBI TReDS FAQ: <https://www.rbi.org.in/scripts/FAQView.aspx/FAQView.aspx/FAQView.aspx?Id=132>
- MSME Samadhaan: <https://ramp.msme.gov.in/ramp/RAMP-initiative/msme-samadhaan/msme-samadhaan>
- ONDC: <https://www.ondc.org/>
- Income Tax e-Filing TDS guidance:
  <https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance>

## Delivery Rules

Every selected roadmap item must:

- Have a named application and leaf-module owner.
- Identify its customer segment and industry pack where applicable.
- Connect paid access to Plan Access and Entitlements.
- Preserve tenant-database isolation.
- Define permissions using the repository permission convention.
- Include financial and compliance auditability.
- Define web, desktop, mobile, offline, queue, and integration impact.
- Use fixed public contracts for parent and cross-domain relationships.
- Include database migration and upgrade behavior for existing tenant databases.
- Include import validation and permission-controlled exports.
- Pass the complete app-scoped ownership and verification workflow before being declared final.

## Decision Gate for New Work

Before starting a roadmap item, answer:

1. Which paying customer problem does it solve?
2. Which application and leaf module own it?
3. Is it a transaction, master, report, workflow, integration, or managed service?
4. What is the smallest sellable version?
5. What financial, compliance, tenancy, permission, and audit risks exist?
6. Does it require a current legal or portal-rule verification?
7. What data migration is required for existing tenants?
8. How will success be measured?

Suggested success measures include:

- Time saved per monthly close.
- GST mismatches detected before filing.
- Reduction in overdue receivables.
- Bank transactions automatically matched.
- Reduction in stock variance.
- Client retention and monthly recurring revenue.
- Migration time from Tally or Excel.
- Number of unresolved audit exceptions.
- Time from invoice issue to payment.
