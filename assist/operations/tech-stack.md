# Tech Stack Notes

## Primary Stack

- Node.js for server runtime.
- TypeScript for type safety across backend, frontend, desktop, and shared packages.
- Fastify for backend APIs.
- React for web UI.
- TanStack Router for frontend routing.
- Tailwind CSS for styling.
- shadcn/ui for UI components.
- `@cxapp/ui` as the internal UI framework and design system.
- Mantine-inspired UI styling and ergonomics without adopting Mantine as the application framework.
- TanStack Query for server state.
- TanStack Table for data tables.
- Zod for API, form, config, event, queue, CLI, and webhook validation.
- MariaDB for relational data.
- Switchable file storage with local filesystem, S3-compatible object storage, and MinIO support.
- Custom storage utility container with MinIO and FileBrowser.org where useful.
- Docker for local and production containers.
- WinUI 3 and .NET 10 for the Windows-native desktop shell.
- WebView2 for hosting the shared React application in the Windows shell.
- Capacitor for future Android and iOS hosts that reuse the shared React application.

## Backend Direction

Backend should provide:

- Tenant-aware API layer.
- Domain modules.
- Application services.
- Events.
- Queue workers.
- Integration adapters.
- Authentication and authorization.
- Audit logging.
- Sync endpoints.

Fastify plugins should be used carefully for infrastructure concerns, not for hiding business rules.

## Frontend Direction

Frontend should provide:

- Central app shell.
- Tenant-aware navigation.
- Module-aware routing.
- Shared design system.
- Forms.
- Tables.
- Filters.
- Dashboards.
- Permission-aware actions.
- Offline indicators where needed.

TanStack Query should manage server state. Local UI state should stay close to components unless shared workflow state is required.

## Desktop Direction

The WinUI 3 host owns Windows lifecycle, WebView2, device integration, local printing, packaging,
and secure updates. React remains the only product UI, and the Node.js Platform API remains the
authority for authentication, tenancy, permissions, and business data.

The Windows release target is offline-first and single-tenant per installation. Packaged React assets
use a bundled Node.js loopback API backed by SQLite. The cloud remains the control plane,
synchronization hub, backup projection, and auditor web. Offline business persistence is enabled only
after each owning module supplies its SQLite repository, sync schema, conflict policy, audit, and
cloud endpoints.

## Mobile Direction

Capacitor should support:

- Tenant login.
- Mobile-friendly workflows.
- Offline-first data where needed.
- Camera or barcode features where useful.
- Push notifications where useful.

## Styling Direction

Use Tailwind and shadcn/ui as the base. The design system should define:

- Colors.
- Typography.
- Spacing.
- Tables.
- Forms.
- Dialogs.
- Empty states.
- Loading states.
- Error states.
- Business status badges.

## Package Direction

Suggested package areas:

- Platform core.
- Shared types.
- Shared UI.
- Domain modules.
- Industry packs.
- Integration adapters.
- Desktop shell.
- Mobile app.
- Agent tools.
