# App Operations

App Operations is the Super Admin runtime-status surface for the composed Platform application.

## Repository Apps

- Platform: API `7010`, web `7020`.
- Core, Billing, Mail, Framework, and UI are workspace packages loaded by Platform and own no startup ports.

## Controls

- Refresh probes Platform API and Platform Web and records response time.
- Process lifecycle is owned by the root `npm run dev` command or the deployment supervisor.
- The Super Admin screen does not start, stop, restart, or update repository processes.
