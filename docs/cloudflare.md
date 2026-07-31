# Cloudflare Tunnel for MariaDB

This runbook connects a database client such as SQLyog to the CXApp MariaDB container without
publishing MariaDB directly to the Internet.

## Verified CXApp configuration

| Setting                | Value                      |
| ---------------------- | -------------------------- |
| Public hostname        | `data.codexsun.com`        |
| Cloudflare route type  | Published application, TCP |
| Tunnel origin          | `tcp://cxapp-mariadb:3306` |
| Windows local listener | `127.0.0.1:13307`          |
| Verified server        | `11.8.8-MariaDB-ubu2404`   |

The Cloudflare connector must be attached to the same Docker network as `cxapp-mariadb` for the
container hostname to resolve. If `cloudflared` runs directly on the server host instead, use a
MariaDB address that is reachable from that host rather than the Docker-only service name.

## Server configuration

1. Open Cloudflare Zero Trust and select **Networks -> Tunnels**.
2. Create or select the tunnel used by the CXApp server.
3. Add a **Published application** route with:

   - Hostname: `data.codexsun.com`
   - Service type: `TCP`
   - Service URL: `tcp://cxapp-mariadb:3306`

4. Run the Cloudflare connector using the installation command or tunnel token supplied by the
   Cloudflare dashboard. Never commit the tunnel token or credentials file to this repository.
5. Ensure the connector and `cxapp-mariadb` share a Docker network.

MariaDB does not need a public firewall rule or a publicly bound port for this configuration.

## Install on a new Windows computer

Open PowerShell and install the official Cloudflare client:

```powershell
winget install --id Cloudflare.cloudflared --exact `
  --accept-package-agreements --accept-source-agreements
```

Close and reopen PowerShell so the updated executable path is available, then verify it:

```powershell
cloudflared --version
```

## Start the database tunnel

Run this command on the Windows computer that runs SQLyog:

```powershell
cloudflared access tcp `
  --hostname data.codexsun.com `
  --url 127.0.0.1:13307
```

Keep this PowerShell window open while using the database. If Cloudflare Access is enabled, the
command opens a browser and requires the authorized user to sign in.

If `cloudflared` is not found in a newly opened terminal, use the installed path directly:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" access tcp `
  --hostname data.codexsun.com `
  --url 127.0.0.1:13307
```

Use another unused local port if `13307` is already occupied. The selected local port is local to
the Windows computer and does not need to match the MariaDB container port.

## SQLyog configuration

Disable **Use SSH Tunneling** in SQLyog. Cloudflare provides the tunnel, so SQLyog must use a
normal MySQL connection to the local listener.

Configure the **MySQL** tab with:

| Field              | Value                  |
| ------------------ | ---------------------- |
| MySQL Host Address | `127.0.0.1`            |
| Port               | `13307`                |
| Username           | MariaDB user name      |
| Password           | MariaDB password       |
| Database(s)        | Optional database name |

Do not use the SSH server username or password in the MySQL fields. Do not enable SQLyog's SSH
tunnel or point SQLyog directly at `data.codexsun.com`.

## Verify the connection

Confirm that the local client is listening:

```powershell
Test-NetConnection 127.0.0.1 -Port 13307
```

`TcpTestSucceeded` must be `True`.

When the MariaDB command-line client is installed, verify database authentication without placing
the password in command history:

```powershell
mariadb --protocol=TCP --host=127.0.0.1 --port=13307 --user=YOUR_DB_USER --password
```

Enter the MariaDB password only when prompted.

## Stop and reconnect

Press `Ctrl+C` in the PowerShell window running `cloudflared` to close the local tunnel. After a
restart or sign-out, run the `cloudflared access tcp` command again before opening the SQLyog
connection.

## Troubleshooting

### SQLyog reports an SSH timeout

Disable **Use SSH Tunneling**. The Cloudflare connection is not an SQLyog SSH tunnel.

### Connection to `127.0.0.1:13307` is refused

The Windows `cloudflared access tcp` process is not running, exited, or is using another local
port. Start it again and check `Test-NetConnection`.

### Cloudflare hostname cannot connect to the origin

Check that:

- the Cloudflare tunnel is healthy;
- its published route is `tcp://cxapp-mariadb:3306`;
- the connector shares the MariaDB container's Docker network;
- the `cxapp-mariadb` container is running and healthy; and
- outbound Cloudflare tunnel traffic is permitted by the server firewall.

### MariaDB reports access denied

The Cloudflare route is working, but the MariaDB username, password, or user host grant is not
valid. Use a dedicated administrative database account with only the required privileges. Do not
place database passwords, Cloudflare tokens, or tunnel credential files in documentation, shell
history, screenshots, or source control.

### Connection drops during use

Restart `cloudflared access tcp`, then reconnect SQLyog. For unattended or long-running database
clients, use a managed Cloudflare private-network/WARP configuration instead of relying on an
interactive Access TCP session.
