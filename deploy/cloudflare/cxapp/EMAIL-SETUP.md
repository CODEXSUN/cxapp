# Optional CXApp enquiry relay

Undeployed template. Configure SMTP_USER, ENQUIRY_TO, CXAPP_SMTP_PASSWORD and CXAPP_RELAY_SECRET in the ignored root .env before running deploy/hostinger/cxapp/configure-env.mjs. That script writes /etc/cxapp-enquiry.env on the VPS. Never print or commit credentials.

The proposed mail-api.codexsun.com endpoint needs DNS, TLS and reverse-proxy setup. Configure Worker ENQUIRY_SHARED_SECRET and ENQUIRY_RELAY_ENABLED only after verifying actual delivery. The current cxapp installation does not depend on this relay.
