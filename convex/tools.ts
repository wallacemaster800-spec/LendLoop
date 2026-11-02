import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { category, condition } from "./schema";
import { available, enqueue, fail, member, text } from "./model";
import { day } from "../lib/domain";
export const publicList = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    const result: { name: string; category: string }[] = [];
    for (const tool of tools) {
      if (await available(ctx, tool._id, day(), day()))
        result.push({ name: tool.name, category: tool.category });
    }
    return result;
  },
});
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await member(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    return Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.owner);
        const booked = await ctx.db
          .query("loans")
          .withIndex("by_tool_status", (q) => q.eq("tool", tool._id).eq("status", "approved"))
          .collect();
        return {
          ...tool,
          mine: user._id === tool.owner,
          ownerName: owner?.name ?? "Neighbor",
          trusted: owner?.trusted ?? false,
          available: await available(ctx, tool._id, day(), day()),
          booked: booked.map((l) => ({ start: l.start, end: l.end, overdue: l.end < day() })),
        };
      }),
    );
  },
});
const fields = { name: v.string(), category, condition, description: v.string() };
export const save = mutation({
  args: { id: v.optional(v.id("tools")), ...fields },
  handler: async (ctx, args) => {
    const user = await member(ctx);
    const data = {
      name: text(args.name, "Name", 2, 80),
      category: args.category,
      condition: args.condition,
      description: text(args.description, "Description", 10, 500),
    };
    if (args.id) {
      const tool = await ctx.db.get(args.id);
      if (!tool || tool.archived) fail("Listing not found.");
      if (tool.owner !== user._id) fail("You can only edit your own listings.");
      await ctx.db.patch(args.id, data);
      return args.id;
    }
    const own = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("owner", user._id))
      .collect();
    if (own.filter((t) => !t.archived).length >= 30) fail("You can have up to 30 active listings.");
    return ctx.db.insert("tools", { ...data, owner: user._id, archived: false });
  },
});
export const remove = mutation({
  args: { id: v.id("tools") },
  handler: async (ctx, { id }) => {
    const user = await member(ctx);
    const tool = await ctx.db.get(id);
    if (!tool || tool.archived) fail("Listing not found.");
    if (tool.owner !== user._id && !user.admin) fail("You can only remove your own listings.");
    const active = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("tool", id).eq("status", "approved"))
      .first();
    if (active && !user.admin)
      fail("Mark outstanding loans as returned before removing this listing.");
    await ctx.db.patch(id, { archived: true });
    const pending = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("tool", id).eq("status", "pending"))
      .collect();
    for (const loan of pending) {
      await ctx.db.patch(loan._id, { status: "declined", updatedAt: Date.now() });
      await enqueue(ctx, loan, "declined", loan.borrower);
    }
  },
});
