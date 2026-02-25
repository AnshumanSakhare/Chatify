import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mark conversation as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadTime: Date.now() });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: args.userId,
        lastReadTime: Date.now(),
      });
    }
  },
});

// Get unread count for a conversation for a user
export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    const lastReadTime = receipt?.lastReadTime ?? 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("senderId"), args.userId),
          q.gt(q.field("createdAt"), lastReadTime)
        )
      )
      .collect();

    return unreadMessages.length;
  },
});

// Get unread counts for all conversations for a user
export const getUnreadCountsForUser = query({
  args: {
    userId: v.string(),
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, number> = {};

    for (const conversationId of args.conversationIds) {
      const receipt = await ctx.db
        .query("readReceipts")
        .withIndex("by_conversation_and_user", (q) =>
          q.eq("conversationId", conversationId).eq("userId", args.userId)
        )
        .first();

      const lastReadTime = receipt?.lastReadTime ?? 0;

      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_time", (q) =>
          q.eq("conversationId", conversationId)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("senderId"), args.userId),
            q.gt(q.field("createdAt"), lastReadTime)
          )
        )
        .collect();

      results[conversationId] = unreadMessages.length;
    }

    return results;
  },
});
