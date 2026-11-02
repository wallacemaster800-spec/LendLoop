# Connected acceptance checks

Use a development deployment with two ordinary users A/B and one admin. Do not run synthetic cases against real neighbors.

## Browser flow

- Sign out: only available tool names and categories are returned by the public Convex query. Check its network response, not just the screen.
- A creates a tool, edits it, and sees it under My listings.
- B finds it by category, requests today through tomorrow, and sees My requests.
- A sees Incoming requests; B cannot approve and an unrelated user cannot read or change the loan.
- A approves. The tool becomes unavailable today. It remains visible to signed-in users.
- A or B marks it returned. The tool becomes available again.
- Try overlapping approvals from separate browser sessions. Only one succeeds.
- Try removing an active listing as its owner, then as admin. The owner is blocked; the admin archives it while preserving the loan.
- Admin grants and removes Trusted Lender. An ordinary user cannot call that mutation.
- Verify mobile navigation, keyboard focus, dialog Escape behavior and error feedback.

## Event workflow

- Publish the request workflow and select the imported error workflow.
- Create a request. Within the next minute, inspect the n8n execution and the loan's activity.
- Confirm the event input has only an opaque event ID inside a signed envelope.
- Retry the same execution. The notification table must still contain one row for that event.
- Change a signed payload byte or use an expired timestamp. Verification must fail before a callback occurs.
- Temporarily break the webhook URL. After five attempts the event must be visible in the admin failure queue. Restore the URL and retry.

## Overdue workflow

In the **development Convex dashboard only**, set an approved test loan's end date to yesterday, with its start earlier. Do not add a browser-accessible function to bypass dates.

- Run the overdue workflow manually. It should record one reminder and surface it in the loan's activity.
- Run it again that day. There must be no additional reminder.
- Restore another approved overdue fixture, fetch it, then return the loan before the callback. The callback must skip it.
- Break a callback configuration. The HTTP node retries, then n8n retains a failed execution. Check the error workflow and rerun after fixing the configuration.
- Ensure the published schedule runs at 09:00 UTC and the n8n machine clock is synchronized.

## Delivery review

Before submitting: run the checks in README, inspect Git's staged changes for keys, publish the repository, verify the connected URL in a fresh browser profile and rehearse the architecture explanation. Keep the distinction between the local mock channel and external email explicit.
