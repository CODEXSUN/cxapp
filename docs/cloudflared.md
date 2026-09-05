# Cloudflared TCP Client Tunnel

Use this runbook to connect a local database client to the CXApp MariaDB TCP route.

## Connection details

| Setting | Value |
| --- | --- |
| Cloudflare hostname | `data.codexsun.com` |
| Local listener | `127.0.0.1:13307` |
| Protocol | TCP |

Keep the `cloudflared` command running while you use the database client.

## Git Bash

Run this command as one line in Git Bash:

```bash
"/c/Program Files (x86)/cloudflared/cloudflared.exe" access tcp --hostname data.codexsun.com --url 127.0.0.1:13307
```

Do not use PowerShell backticks in Git Bash. Git Bash treats backticks as command substitution.

If `cloudflared` is on your `PATH`, run:

```bash
cloudflared access tcp --hostname data.codexsun.com --url 127.0.0.1:13307
```

## PowerShell

Run this command as one line in PowerShell:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" access tcp --hostname data.codexsun.com --url 127.0.0.1:13307
```

You can also use PowerShell line continuation. The backtick must be the last character on its line.

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" access tcp `
  --hostname data.codexsun.com `
  --url 127.0.0.1:13307
```

## Verify the listener

Open a second PowerShell window and run:

```powershell
Test-NetConnection 127.0.0.1 -Port 13307
```

`TcpTestSucceeded` must be `True`.

## Database client settings

Disable SSH tunneling in SQLyog or another database client.

| Field | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `13307` |
| User | MariaDB user name |
| Password | MariaDB password |

Use normal MySQL or MariaDB authentication. Do not connect the client directly to `data.codexsun.com`.

## Stop the tunnel

Press `Ctrl+C` in the window that runs `cloudflared`.

For server-side route configuration, see [cloudflare.md](./cloudflare.md).
