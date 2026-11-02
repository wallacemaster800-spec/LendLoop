import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const category = v.union(
  v.literal("Power tools"),
  v.literal("Garden"),
  v.literal("Kitchen"),
  v.literal("Camping"),
  v.literal("Hand tools"),
  v.literal("Other"),
);
export const condition = v.union(v.literal("Like new"), v.literal("Good"), v.literal("Well used"));
export const status = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);
export default defineSchema({
  members: defineTable({ subject: v.string(), name: v.string(), trusted: v.boolean() }).index(
    "by_subject",
    ["subject"],
  ),
  tools: defineTable({
    owner: v.id("members"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    archived: v.boolean(),
  })
    .index("by_owner", ["owner"])
    .index("by_archived", ["archived"]),
  loans: defineTable({
    tool: v.id("tools"),
    lender: v.id("members"),
    borrower: v.id("members"),
    start: v.string(),
    end: v.string(),
    status,
    updatedAt: v.number(),
  })
    .index("by_tool_status", ["tool", "status"])
    .index("by_lender", ["lender"])
    .index("by_borrower", ["borrower"])
    .index("by_status_end", ["status", "end"]),
  events: defineTable({
    loan: v.id("loans"),
    recipient: v.id("members"),
    kind: v.string(),
    state: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    attempts: v.number(),
    nextAttempt: v.number(),
    deliveredAt: v.optional(v.number()),
    error: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
  })
    .index("by_loan", ["loan"])
    .index("by_state_next", ["state", "nextAttempt"]),
  notifications: defineTable({
    key: v.string(),
    loan: v.id("loans"),
    recipient: v.id("members"),
    kind: v.string(),
    recordedAt: v.number(),
    channel: v.literal("mock"),
  })
    .index("by_key", ["key"])
    .index("by_loan", ["loan"])
    .index("by_recipient", ["recipient"]),
});
