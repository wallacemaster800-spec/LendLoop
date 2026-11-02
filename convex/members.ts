import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { admin, identity, isAdmin, text } from "./model";
export const sync = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await identity(ctx);
    const existing = await ctx.db
      .query("members")
      .withIndex("by_subject", (q) => q.eq("subject", auth.subject))
      .unique();
    const name = text(auth.givenName ?? auth.name ?? "Neighbor", "Name", 1, 100);
    if (existing) {
      if (existing.name !== name) await ctx.db.patch(existing._id, { name });
      return existing._id;
    }
    return ctx.db.insert("members", { subject: auth.subject, name, trusted: false });
  },
});
export const me = query({
  args: {},
  handler: async (ctx) => {
    const auth = await ctx.auth.getUserIdentity();
    if (!auth) return null;
    const user = await ctx.db
      .query("members")
      .withIndex("by_subject", (q) => q.eq("subject", auth.subject))
      .unique();
    return user
      ? { _id: user._id, name: user.name, trusted: user.trusted, admin: isAdmin(auth.subject) }
      : null;
  },
});
export const list = query({
  args: {},
  handler: async (ctx) => {
    await admin(ctx);
    return (await ctx.db.query("members").collect()).map((u) => ({
      _id: u._id,
      name: u.name,
      trusted: u.trusted,
    }));
  },
});
export const setTrusted = mutation({
  args: { id: v.id("members"), trusted: v.boolean() },
  handler: async (ctx, args) => {
    await admin(ctx);
    await ctx.db.patch(args.id, { trusted: args.trusted });
  },
});
