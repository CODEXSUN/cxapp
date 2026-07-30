# Security And Compliance

## Security Goals

CODEXSUN must protect tenant data, financial data, credentials, user identity, and compliance records.

## Authentication

Authentication should support:

- Secure password login.
- Session management.
- Secure HTTP-only cookie sessions for web dashboards.
- Access token and refresh token flow for desktop and mobile clients.
- Optional multi-factor authentication.
- Required multi-factor authentication for Super Admin and Staff users.
- Device awareness for desktop and mobile.
- Secure password reset.
- Login audit trail.

## Authorization

Authorization should support:

- Role-based access control.
- System roles plus dynamic custom roles.
- Permission groups by module.
- Tenant-scoped roles.
- Feature activation checks.
- Admin and support access separation.
- Fine-grained access for financial reports and compliance actions.

## Sensitive Data

Sensitive data includes:

- Tenant database credentials.
- External API keys.
- WhatsApp and Telegram tokens.
- User credentials.
- Financial records.
- Tax identifiers.
- Customer contact information.
- AI conversation data when it references business records.

Sensitive data must be encrypted or protected according to its risk.

## Compliance Focus

Indian business compliance is a core requirement.

Important areas:

- GST invoice correctness.
- GST reports.
- e-Invoice flow.
- e-Way bill flow.
- Audit trail.
- Financial year handling.
- Voucher traceability.
- Data retention.
- Document numbering.

## Audit Trail

Audit trail should capture:

- Who performed the action.
- Tenant context.
- Time of action.
- Module and record.
- Before and after values where required.
- Source client.
- Related event or job ID.

## AI Security

AI tools must:

- Follow user permissions.
- Log important tool use.
- Avoid exposing hidden fields.
- Avoid cross-tenant retrieval.
- Ask for confirmation before actions.
- Never train on tenant data without explicit policy and consent.

## Browser Session Security

- Tenant selection and authentication are server decisions bound to a verified host.
- Browser JWT or session storage in Web Storage is prohibited.
- Production cookies must be encrypted, HttpOnly, Secure, host-only, SameSite Strict, and revocable.
- Login and logout must clear legacy cookies and browser-readable tokens.
- Signed claims must validate algorithm, type, issuer, audience, subject, expiry, session ID, tenant, and login host.
- Cookie-authenticated state changes must reject cross-site requests and mismatched origins.
- Cached tenant/company context is non-secret and non-authoritative; permissions and tenant lifecycle state are checked live.
