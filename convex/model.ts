import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { cleanText, day, overlaps, validateDates } from "../lib/domain";

export function fail(message: string): never {
  throw new ConvexError(message);
}
export async function identity(ctx: QueryCtx) {
  const auth = await ctx.auth.getUserIdentity();
  if (!auth) fail("Sign in to continue.");
  return auth;
}
export function isAdmin(subject: string) {
  return (process.env.ADMIN_SUBJECTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(subject);
}
export async function member(ctx: QueryCtx) {
  const auth = await identity(ctx);
  const user = await ctx.db
    .query("members")
    .withIndex("by_subject", (q) => q.eq("subject", auth.subject))
    .unique();
  if (!user) fail("Finish signing in, then try again.");
  return { ...user, admin: isAdmin(auth.subject) };
}
export async function admin(ctx: QueryCtx) {
  const user = await member(ctx);
  if (!user.admin) fail("Administrator access required.");
  return user;
}
export function text(value: string, label: string, min: number, max: number) {
  try {
    return cleanText(value, label, min, max);
  } catch (e) {
    fail((e as Error).message);
  }
}
export function dates(start: string, end: string) {
  try {
    validateDates(start, end);
  } catch (e) {
    fail((e as Error).message);
  }
}
export async function available(ctx: QueryCtx, tool: Id<"tools">, start: string, end: string) {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("tool", tool).eq("status", "approved"))
    .collect();
  // An overdue item is still physically out, even if its planned dates don't overlap.
  return !approved.some((l) => l.end < day() || overlaps(start, end, l.start, l.end));
}
export async function enqueue(
  ctx: MutationCtx,
  loan: Doc<"loans">,
  kind: string,
  recipient: Id<"members">,
) {
  await ctx.db.insert("events", {
    loan: loan._id,
    recipient,
    kind,
    state: "pending",
    attempts: 0,
    nextAttempt: Date.now(),
  });
}
export async function loanView(ctx: QueryCtx, loan: Doc<"loans">) {
  const [tool, lender, borrower, events, notes] = await Promise.all([
    ctx.db.get(loan.tool),
    ctx.db.get(loan.lender),
    ctx.db.get(loan.borrower),
    ctx.db
      .query("events")
      .withIndex("by_loan", (q) => q.eq("loan", loan._id))
      .collect(),
    ctx.db
      .query("notifications")
      .withIndex("by_loan", (q) => q.eq("loan", loan._id))
      .collect(),
  ]);
  return {
    ...loan,
    toolName: tool?.name ?? "Removed tool",
    lenderName: lender?.name ?? "Member",
    borrowerName: borrower?.name ?? "Member",
    overdue: loan.status === "approved" && loan.end < day(),
    activity: [
      ...events.map((e) => ({
        id: e._id,
        kind: e.kind,
        state: e.state,
        at: e.deliveredAt ?? e._creationTime,
        attempts: e.attempts,
      })),
      ...notes
        .filter((n) => n.kind === "overdue")
        .map((n) => ({
          id: n._id,
          kind: "overdue",
          state: "delivered" as const,
          at: n.recordedAt,
          attempts: 1,
        })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 5),
  };
}
