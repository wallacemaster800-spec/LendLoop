import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sign } from "../lib/signatures";
export const dispatch = internalAction({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.runQuery(internal.automation.dueEvents, {});
    for (const candidate of events) {
      const event = await ctx.runMutation(internal.automation.claim, { id: candidate._id });
      if (!event) continue;
      let error: string | undefined;
      try {
        const target = process.env.N8N_WEBHOOK_URL;
        const secret = process.env.CONVEX_TO_N8N_SECRET;
        if (!target || !secret) throw new Error("Integration is not configured.");
        const url = new URL(target);
        if (url.protocol !== "https:") throw new Error("Webhook must use HTTPS.");
        const timestamp = Math.floor(Date.now() / 1000).toString();
        // No email, name, description or auth token leaves Convex.
        const payload = JSON.stringify({ eventId: event._id });
        const signature = await sign(secret, "POST", url.pathname, timestamp, payload);
        const response = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timestamp, signature, payload }),
          signal: AbortSignal.timeout(15000),
          redirect: "error",
        });
        if (!response.ok) error = "Workflow returned HTTP " + response.status + ".";
      } catch {
        error = "Notification delivery failed. Check integration settings and n8n executions.";
      }
      await ctx.runMutation(internal.automation.finish, {
        id: event._id,
        attempt: event.attempts,
        error,
      });
    }
  },
});
