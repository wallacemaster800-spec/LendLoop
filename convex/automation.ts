import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { admin, fail } from "./model";
import { day } from "../lib/domain";

export const dueEvents = internalQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("events")
      .withIndex("by_state_next", (q) => q.eq("state", "pending").lte("nextAttempt", Date.now()))
      .take(20),
});
export const claim = internalMutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (
      !event ||
      event.state !== "pending" ||
      event.nextAttempt > Date.now() ||
      (event.leaseUntil ?? 0) > Date.now()
    )
      return null;
    const attempts = event.attempts + 1;
    await ctx.db.patch(id, { attempts, leaseUntil: Date.now() + 120000 });
    return { ...event, attempts };
  },
});
export const finish = internalMutation({
  args: { id: v.id("events"), attempt: v.number(), error: v.optional(v.string()) },
  handler: async (ctx, { id, attempt, error }) => {
    const event = await ctx.db.get(id);
    if (!event || event.state === "delivered" || event.attempts !== attempt) return;
    // A webhook 200 alone is not a delivery receipt. The workflow must persist the mock.
    const receipt = await ctx.db
      .query("notifications")
      .withIndex("by_key", (q) => q.eq("key", "event:" + id))
      .unique();
    if (receipt) {
      await ctx.db.patch(id, {
        state: "delivered",
        deliveredAt: receipt.recordedAt,
        leaseUntil: undefined,
        error: undefined,
      });
    } else {
      await ctx.db.patch(id, {
        state: attempt >= 5 ? "failed" : "pending",
        nextAttempt: Date.now() + Math.min(3600000, 30000 * 2 ** attempt),
        leaseUntil: undefined,
        error: error ?? "Workflow did not record a notification.",
      });
    }
  },
});
export const recordEvent = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) fail("Unknown event.");
    const key = "event:" + eventId;
    const exists = await ctx.db
      .query("notifications")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (exists) return { recorded: false, duplicate: true };
    await ctx.db.insert("notifications", {
      key,
      loan: event.loan,
      recipient: event.recipient,
      kind: event.kind,
      recordedAt: Date.now(),
      channel: "mock",
    });
    await ctx.db.patch(eventId, {
      state: "delivered",
      deliveredAt: Date.now(),
      error: undefined,
      leaseUntil: undefined,
    });
    return { recorded: true, duplicate: false };
  },
});
export const overdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("end", day()))
      .collect();
    const result = [];
    for (const loan of loans) {
      const key = "overdue:" + loan._id + ":" + day();
      if (
        !(await ctx.db
          .query("notifications")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique())
      )
        result.push({ loanId: loan._id, day: day() });
    }
    return result;
  },
});
export const recordReminder = internalMutation({
  args: { loanId: v.id("loans"), day: v.string() },
  handler: async (ctx, args) => {
    if (args.day !== day()) fail("Reminder date must be today in UTC.");
    const loan = await ctx.db.get(args.loanId);
    if (!loan) fail("Unknown loan.");
    // Recheck at write time: a return may happen after the daily fetch.
    if (loan.status !== "approved" || loan.end >= day()) return { recorded: false, skipped: true };
    const key = "overdue:" + loan._id + ":" + day();
    if (
      await ctx.db
        .query("notifications")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )
      return { recorded: false, duplicate: true };
    await ctx.db.insert("notifications", {
      key,
      loan: loan._id,
      recipient: loan.borrower,
      kind: "overdue",
      recordedAt: Date.now(),
      channel: "mock",
    });
    return { recorded: true, duplicate: false };
  },
});
export const failures = query({
  args: {},
  handler: async (ctx) => {
    await admin(ctx);
    return ctx.db
      .query("events")
      .withIndex("by_state_next", (q) => q.eq("state", "failed"))
      .collect();
  },
});
export const retry = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await admin(ctx);
    const event = await ctx.db.get(id);
    if (!event || event.state !== "failed") fail("Only failed events can be retried.");
    await ctx.db.patch(id, {
      state: "pending",
      attempts: 0,
      nextAttempt: Date.now(),
      error: undefined,
      leaseUntil: undefined,
    });
  },
});
