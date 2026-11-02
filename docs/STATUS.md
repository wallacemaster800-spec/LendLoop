# Local handoff — 2 November 2026

## Implemented and checked

- Next.js production build and strict TypeScript check pass.
- 42 automated tests pass: business rules, Convex permissions, integration HTTP endpoints, HMAC, idempotency, delivery retries and exported n8n code.
- Six Chromium browser tests pass: public/setup page, listing CRUD, full demo loan lifecycle, admin view, mobile layout and browser errors.
- Local n8n 2.45.7 is installed in Docker, bound to 127.0.0.1:5678.
- The three application workflows are imported, with both main workflows linked to the error workflow. They remain inactive.
- An additional local signing-check workflow ran successfully inside n8n: crypto module access, environment access, webhook verification and response signing.
- Production dependencies and development tooling passed npm audit with zero reported vulnerabilities at installation.
- Screenshots were inspected at desktop and mobile widths. Fonts are bundled locally.
- .env.local exists with empty application keys. .env.n8n contains independent randomly generated local secrets. Both are ignored by Git; no credentials are included in exports.

## Still requires account setup and connected testing

- Create/configure Clerk and Convex development applications.
- Set the Clerk issuer, admin user ID, integration secrets and HTTPS webhook URL in Convex.
- Complete the n8n owner-account setup at localhost:5678, enter the Convex site URL/public n8n URL, then restart the container and activate the main workflows.
- Provide public HTTPS access to the webhook while keeping the editor private.
- Run the real two-account acceptance checks in ACCEPTANCE.md. The local demo and mocked Convex tests do not verify a real Clerk login or cloud deployment.
- Publish a GitHub repository and, if desired, deploy the frontend. Nothing has been submitted to the employer.

## Open it

Double-click Start-LendLoop.cmd and visit http://localhost:3100/demo. This starts the already-built production preview. Use npm run dev when editing the source. Rebuild after source or environment changes before using npm start.

Docker has its own lifecycle. To stop n8n without deleting its workflows:

```sh
docker compose --env-file .env.n8n stop
```

To resume it:

```sh
docker compose --env-file .env.n8n up -d
```

The extra local verification workflow is named “LendLoop local signing check”. It never calls an employer or sends a notification; it is not one of the deliverable automation exports.
