# Tech Stack Notes

## Primary Stack

- Node.js for server runtime.
- TypeScript for type safety across backend, frontend, desktop, and shared packages.
- Fastify for backend APIs.
- React for web UI.
- TanStack Router for frontend routing.
- Tailwind CSS for styling.
- shadcn/ui for UI components.
- `@codexsun/ui` as the internal UI framework and design system.
- Mantine-inspired UI styling and ergonomics without adopting Mantine as the application framework.
- TanStack Query for server state.
- TanStack Table for data tables.
- Zod for API, form, config, event, queue, CLI, and webhook validation.
- MariaDB for relational data.
- Switchable file storage with local filesystem, S3-compatible object storage, and MinIO support.
- Custom storage utility container with MinIO and FileBrowser.org where useful.
- Docker for local and production containers.
- Electron for desktop app.
- React Native with Expo for mobile app.

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

Electron should support:

- Offline store.
- Device identity.
- Background sync.
- Local printing.
- POS hardware where needed.
- Secure update flow.

## Mobile Direction

Expo should support:

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
