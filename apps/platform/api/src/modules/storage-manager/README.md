# Storage Manager

The Storage Manager owns application and tenant file storage.

## Company logos

- `POST /tenant/media/company-logo` uploads an SVG for a saved company.
- The request must include `companyId`, `contentBase64`, and `variant`.
- The tenant session must have `core.application.records.update` access.
- New files use `companies/{companyId}/logo/` in the tenant public storage root.
- Reads use the old tenant logo folder only when a company-scoped file does not exist.
- `GET /tenant/media/companies/:companyId/company-logo/:variant` requires tenant view access.
- `GET /public/app-portal/company-logo/:variant` serves the Application Company logo for the request domain.
- The public route uses the default tenant only for the configured shared application domain.

The module accepts only safe SVG files. The maximum file size is 640 KB.
