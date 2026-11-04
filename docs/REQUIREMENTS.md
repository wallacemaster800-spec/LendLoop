# Requirement coverage

| Requirement                                   | Implementation                                                   |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Next.js App Router + TypeScript               | app/, strict tsconfig                                            |
| Clerk authentication                          | live-app.tsx, proxy.ts, Convex auth.config.ts                    |
| Convex public name/category list              | tools.publicList; available today, no owner data                 |
| Name, category, condition, description        | tools.save and listing form                                      |
| Borrow by date range                          | loans.request; server validation                                 |
| Approve/decline own requests                  | loans.transition; owner checks                                   |
| Return loans                                  | loans.transition; either participant after start                 |
| Availability and category filters             | tools.list and dashboard                                         |
| My listings / My requests / Incoming requests | dashboard tabs                                                   |
| Admin removal, all loans, Trusted Lender      | admin checks in tools, loans, members                            |
| Backend-enforced permissions                  | model.ts and every public private-data function                  |
| Notification webhook workflow                 | request-notifications.json + outbox delivery                     |
| Daily overdue workflow                        | overdue-reminders.json + signed HTTP actions                     |
| Signatures in both directions                 | lib/signatures.ts and n8n/code                                   |
| Secret-free workflow export                   | environment references; no credential values                     |
| Idempotent callbacks                          | unique event key / loan+day checked transactionally              |
| Retries and visible failures                  | leased outbox, retry queue, n8n execution history/error workflow |
| Per-loan automation activity                  | loanView and expandable activity                                 |
| Local setup / architecture / production notes | README, Compose, docs                                            |
| GitHub repository                             | https://github.com/wallacemaster800-spec/LendLoop     |

Clerk, Convex and local n8n are connected. The deployed backend and signed webhook round trip were verified with synthetic development identities; see STATUS.md and connected-verification.json. Two real Clerk browser sessions remain a manual acceptance check; this limitation is recorded rather than reported as tested. Authenticated photo API verification is recorded in photo-verification.json.

Optional extension: authenticated listing photos in Convex File Storage, server-side WebP normalization, content validation, upload quotas and ownership enforcement. Photos were not required by the assignment.
