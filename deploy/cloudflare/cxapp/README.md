# CXApp Cloudflare

Production uses codexsun-tunnel: app.codexsun.com -> http://cxapp-web:80; media.codexsun.com -> http://cxapp-media:80; data.codexsun.com -> tcp://cxapp-mariadb:3306. Run npx wrangler whoami to verify local access.

The optional cxapp-enquiry Worker has no custom-domain routes. Build the web assets before use. It does not replace the app API or production tunnel. The proposed mail-api.codexsun.com endpoint is not configured or verified. Do not enable the relay before DNS, TLS and delivery validation.
