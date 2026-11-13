# CXApp deployment

Installed production app: https://app.codexsun.com, Hostinger VPS 914719 (69.62.81.166), active production checkout /home/cxapp-releases/1.0.82-dc73dda, version 1.0.82 deployed 13 November 2026. The original /home/cxapp checkout and its configuration remain available for rollback/reference.

Run node deploy/hostinger/connection/status.mjs for a read-only SSH connection check. The actual app deployment uses .container/billing/docker-compose.yml and the private .container/deploy.env.

Cloudflare production uses codexsun-tunnel. See cloudflare/cxapp/README.md. The Worker and hostinger/cxapp enquiry service are optional, undeployed templates. The relay uses a separate loopback port 3110 and requires configured sender, recipient, secrets, DNS and TLS. They are not the production deployment mechanism.

Do not run configure-env.mjs or attach-key.mjs for an audit: they change remote configuration. No production configuration was changed during this refactor.
