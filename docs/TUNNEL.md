# Local automation connection

This optional development profile exposes one signed webhook to Convex Cloud. The n8n editor remains on 127.0.0.1:5678. It does not publish the frontend.

## Start and connect

With Docker Desktop running:

```sh
docker compose --env-file .env.n8n -f compose.yml -f compose.tunnel.yml up -d
node scripts/connect-automations.mjs
```

Wait for the tunnel to print its temporary HTTPS URL before running the connection script. The script obtains that URL from Docker logs, updates N8N_WEBHOOK_URL in the selected Convex deployment, and checks that the editor route returns 404 and unsigned webhook requests return 401.

The three application workflows must be imported and the two main workflows published. See README for first-time installation. This script does not change workflow content or publish unrelated workflows.

## Trust boundary

Internet → Cloudflare HTTPS → private Docker gateway → n8n → signed HTTPS callback to Convex.

The gateway exposes only POST /webhook/lendloop-events. It rejects other routes, oversized bodies and invalid or stale signatures before forwarding to n8n. n8n validates the same envelope again. The gateway has no host port; the editor is bound to loopback only.

The tunnel provider terminates HTTPS. HMAC authenticates requests end to end; it is not encryption. Payloads contain opaque event identifiers, not user names, email addresses or tokens.

## Lifecycle

A Quick Tunnel is temporary, changes hostname when recreated and has no uptime guarantee. Restarting Docker may require rerunning the connection script. Use hosted n8n or a named tunnel with a stable hostname for a reliable shared demonstration.

Stop only this project's services:

```sh
docker compose --env-file .env.n8n -f compose.yml -f compose.tunnel.yml stop
```

This preserves the n8n volume. Never use down --volumes unless you intend to erase the local workflow database.

References: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) and [n8n CLI](https://docs.n8n.io/hosting/cli-commands/).
