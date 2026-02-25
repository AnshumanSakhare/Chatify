import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Toggle a reaction on a message
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: args.userId,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    }
  },
});

// Get reactions for messages in a conversation
export const getReactionsForMessages = query({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    if (args.messageIds.length === 0) return [];

    const allReactions = await ctx.db.query("reactions").collect();
    return allReactions.filter((r) =>
      args.messageIds.includes(r.messageId)
    );
  },
});
