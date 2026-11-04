# Delivery status — 4 November 2026

## Implemented

- Next.js App Router, TypeScript, Clerk authentication and Convex backend.
- Public name/category catalog; authenticated listings, date-range requests, approvals, declines, returns and administrator tools.
- Server-enforced ownership and roles. Signed n8n notifications and overdue reminders, idempotent callbacks, retry outbox and error workflow.
- Optional listing photos: authenticated storage, server-side WebP conversion, content validation, quotas and removal. See PHOTOS.md and SECURITY.md.
- Logged mock notifications, as allowed by the assignment. No email provider or payment flow.

## Verification evidence

- 63 automated tests passed: business rules, authorization, signatures, retries, workflows, gateway and image processing/storage permissions.
- Eight Chromium tests passed on the demo interface; these do not test Clerk sign-in.
- TypeScript and the Next.js production build passed.
- Connected backend and n8n round trip verified on 3 November: three signed deliveries, replay deduplication, loan lifecycle and forbidden approval. See connected-verification.json. These use synthetic Convex CLI identities.
- Authenticated photo API verified on 4 November with an existing Clerk development session: JPEG upload, optimized WebP read, anonymous read denied, foreign Origin denied, disguised script rejected and deletion confirmed. The temporary listing was archived. See photo-verification.json. This was an API test, not a browser file-picker test.

## Run and review

Follow README.md to configure your own Clerk, Convex and n8n development environment. The app uses http://localhost:3100; /demo and /demo/public are disposable sample views. Photo upload requires the connected authenticated app.

The repository includes workflow exports and production considerations. No public hosted application is claimed. A temporary webhook tunnel depends on the local computer; see TUNNEL.md.

## Remaining manual checks and production work

- Complete the two-real-account Clerk browser walkthrough in ACCEPTANCE.md. One real user has confirmed signing in; backend authorization is covered separately by tests.
- Production hosting, stable webhook endpoint, monitoring, global resource limits, pagination and orphan-file reconciliation remain future work; see PRODUCTION.md and SECURITY.md.
- Portfolio publication and the job application email are separate from this source-code delivery.
