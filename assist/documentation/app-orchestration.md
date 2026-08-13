# App Operations

App Operations is the Super Admin runtime-status surface for the composed Platform application.

## Repository Apps

- Platform: API `7010`, web `7020`.
- Core, Billing, Mail, Framework, and UI are workspace packages loaded by Platform and own no startup ports.

## Controls

- Refresh probes Platform API and Platform Web and records response time.
- The root `npm run dev` command supervises the API and web processes separately.
- A failed local process restarts without stopping the other local process.
- The local supervisor tries a graceful stop before it forces a process-tree stop.
- `npm run dev:api` and `npm run dev:web` start the same watchers separately.
- Process lifecycle is owned by the root development command or the deployment supervisor.
- The Super Admin screen does not start, stop, restart, or update repository processes.
