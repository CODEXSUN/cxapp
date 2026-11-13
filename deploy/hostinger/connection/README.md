# CXApp VPS connection

Run node deploy/hostinger/connection/status.mjs from this repository. It verifies codexsun-hostinger, strict host keys, VPS identity, Docker and /home/cxapp without server changes. Hostinger API access uses the connected hosted MCP service. Legacy wrappers require an ignored HOSTINGER_API_TOKEN. attach-key.mjs changes SSH access and is unnecessary for this connection. Never commit credentials.
