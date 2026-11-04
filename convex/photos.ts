import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { member, fail } from "./model";
import { MAX_PHOTO_OUTPUT } from "../lib/photo-policy";
export const reserve = mutation({
  args: { tool: v.id("tools") },
  handler: async (ctx, { tool }) => {
    const user = await member(ctx);
    const listing = await ctx.db.get(tool);
    if (!listing || listing.archived || listing.owner !== user._id)
      fail("Only the owner can change this photo.");
    const now = Date.now(),
      start = user.photoWindowStart ?? 0;
    const count = now - start < 600_000 ? (user.photoUploadCount ?? 0) : 0;
    if (count >= 5) fail("Upload limit reached. Try again in ten minutes.");
    await ctx.db.patch(user._id, {
      photoWindowStart: count ? start : now,
      photoUploadCount: count + 1,
    });
    return ctx.db.insert("photoUploads", {
      tool,
      subject: user.subject,
      expiresAt: now + 120_000,
      used: false,
    });
  },
});
export const ticket = internalQuery({
  args: { ticket: v.id("photoUploads") },
  handler: async (ctx, args) => {
    const user = await member(ctx);
    const t = await ctx.db.get(args.ticket);
    if (!t || t.subject !== user.subject || t.used || t.expiresAt < Date.now())
      fail("Upload expired or already used.");
    const tool = await ctx.db.get(t.tool);
    if (!tool || tool.archived || tool.owner !== user._id)
      fail("Only the owner can change this photo.");
    return t;
  },
});
export const attach = internalMutation({
  args: { ticket: v.id("photoUploads"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await member(ctx);
    const t = await ctx.db.get(args.ticket);
    if (!t || t.subject !== user.subject || t.used || t.expiresAt < Date.now())
      fail("Upload expired or already used.");
    const tool = await ctx.db.get(t.tool);
    if (!tool || tool.archived || tool.owner !== user._id)
      fail("Only the owner can change this photo.");
    const metadata = await ctx.db.system.get(args.storageId);
    if (
      !metadata ||
      (metadata.contentType !== undefined && metadata.contentType !== "image/webp") ||
      metadata.size > MAX_PHOTO_OUTPUT
    )
      fail("Invalid processed image.");
    if (tool.photoId) await ctx.storage.delete(tool.photoId);
    await ctx.db.patch(tool._id, {
      photoId: args.storageId,
      photoVersion: (tool.photoVersion ?? 0) + 1,
    });
    await ctx.db.patch(t._id, { used: true });
  },
});
export const current = internalQuery({
  args: { tool: v.id("tools") },
  handler: async (ctx, { tool }) => {
    await member(ctx);
    const listing = await ctx.db.get(tool);
    return listing && !listing.archived ? (listing.photoId ?? null) : null;
  },
});
export const remove = mutation({
  args: { tool: v.id("tools") },
  handler: async (ctx, { tool }) => {
    const user = await member(ctx);
    const listing = await ctx.db.get(tool);
    if (!listing || listing.archived || (listing.owner !== user._id && !user.admin))
      fail("You cannot remove this photo.");
    if (listing.photoId) await ctx.storage.delete(listing.photoId);
    await ctx.db.patch(tool, { photoId: undefined, photoVersion: (listing.photoVersion ?? 0) + 1 });
  },
});
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("photoUploads")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .take(200);
    for (const ticket of expired) await ctx.db.delete(ticket._id);
  },
});
