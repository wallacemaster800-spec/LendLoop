import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verify } from "../lib/signatures";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
for (const path of ["/automation/overdue", "/automation/notify", "/automation/remind"]) {
  http.route({
    path,
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const secret = process.env.N8N_TO_CONVEX_SECRET;
      if (!secret || secret.length < 32) return json({ error: "Integration unavailable." }, 503);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "JSON required." }, 415);
      if (Number(request.headers.get("content-length") ?? 0) > 8192)
        return json({ error: "Payload too large." }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 8192)
        return json({ error: "Payload too large." }, 413);
      const valid = await verify(
        secret,
        "POST",
        path,
        request.headers.get("x-lendloop-timestamp"),
        request.headers.get("x-lendloop-signature"),
        raw,
      );
      if (!valid) return json({ error: "Invalid signature." }, 401);
      let data: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          return json({ error: "Invalid body." }, 400);
        data = parsed as Record<string, unknown>;
      } catch {
        return json({ error: "Invalid JSON." }, 400);
      }
      try {
        if (path === "/automation/overdue") {
          if (Object.keys(data).length) return json({ error: "Unexpected fields." }, 400);
          return json({ loans: await ctx.runQuery(internal.automation.overdue, {}) });
        }
        if (path === "/automation/notify") {
          if (Object.keys(data).length !== 1 || typeof data.eventId !== "string")
            return json({ error: "eventId required." }, 400);
          return json(
            await ctx.runMutation(internal.automation.recordEvent, {
              eventId: data.eventId as Id<"events">,
            }),
          );
        }
        if (
          Object.keys(data).length !== 2 ||
          typeof data.loanId !== "string" ||
          typeof data.day !== "string"
        )
          return json({ error: "loanId and day required." }, 400);
        return json(
          await ctx.runMutation(internal.automation.recordReminder, {
            loanId: data.loanId as Id<"loans">,
            day: data.day,
          }),
        );
      } catch {
        return json({ error: "Request could not be processed." }, 400);
      }
    }),
  });
}
export default http;
