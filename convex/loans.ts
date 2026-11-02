import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { admin, available, dates, enqueue, fail, loanView, member } from "./model";
import { day } from "../lib/domain";
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await member(ctx);
    const own = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrower", user._id))
      .collect();
    const incoming = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lender", user._id))
      .collect();
    return Promise.all(
      [...own, ...incoming].sort((a, b) => b.updatedAt - a.updatedAt).map((l) => loanView(ctx, l)),
    );
  },
});
export const all = query({
  args: {},
  handler: async (ctx) => {
    await admin(ctx);
    return Promise.all(
      (await ctx.db.query("loans").order("desc").collect()).map((l) => loanView(ctx, l)),
    );
  },
});
export const request = mutation({
  args: { tool: v.id("tools"), start: v.string(), end: v.string() },
  handler: async (ctx, args) => {
    const user = await member(ctx);
    dates(args.start, args.end);
    const tool = await ctx.db.get(args.tool);
    if (!tool || tool.archived) fail("Listing no longer available.");
    if (tool.owner === user._id) fail("You cannot borrow your own tool.");
    if (!(await available(ctx, tool._id, args.start, args.end)))
      fail("This tool is unavailable for those dates.");
    const requests = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrower", user._id))
      .collect();
    if (
      requests.some(
        (l) => l.tool === args.tool && (l.status === "pending" || l.status === "approved"),
      )
    )
      fail("You already have an open request for this tool.");
    if (requests.filter((l) => l.status === "pending").length >= 10)
      fail("You can have up to 10 pending requests.");
    const id = await ctx.db.insert("loans", {
      ...args,
      lender: tool.owner,
      borrower: user._id,
      status: "pending",
      updatedAt: Date.now(),
    });
    await enqueue(ctx, (await ctx.db.get(id))!, "requested", tool.owner);
    return id;
  },
});
export const transition = mutation({
  args: {
    id: v.id("loans"),
    action: v.union(
      v.literal("approve"),
      v.literal("decline"),
      v.literal("cancel"),
      v.literal("return"),
    ),
  },
  handler: async (ctx, { id, action }) => {
    const user = await member(ctx);
    const loan = await ctx.db.get(id);
    if (!loan) fail("Request not found.");
    const lender = loan.lender === user._id,
      borrower = loan.borrower === user._id;
    if (!lender && !borrower) fail("This request does not belong to you.");
    if (action === "return") {
      if (loan.status !== "approved") fail("Only an approved loan can be returned.");
      if (loan.start > day()) fail("This loan has not started yet.");
    } else {
      if (loan.status !== "pending") fail("This request has already been processed.");
      if (action === "cancel" && !borrower) fail("Only the borrower can cancel.");
      if ((action === "approve" || action === "decline") && !lender)
        fail("Only the lender can decide.");
    }
    if (action === "approve") {
      dates(loan.start, loan.end);
      const tool = await ctx.db.get(loan.tool);
      if (!tool || tool.archived) fail("Listing no longer available.");
      if (!(await available(ctx, loan.tool, loan.start, loan.end)))
        fail("An approved loan already reserves these dates.");
    }
    const status = (
      { approve: "approved", decline: "declined", cancel: "cancelled", return: "returned" } as const
    )[action];
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    await enqueue(ctx, loan, status, lender ? loan.borrower : loan.lender);
  },
});
