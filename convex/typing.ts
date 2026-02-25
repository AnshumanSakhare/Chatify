import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Set typing status
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    userName: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (args.isTyping) {
      if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: Date.now() });
      } else {
        await ctx.db.insert("typing", {
          conversationId: args.conversationId,
          userId: args.userId,
          userName: args.userName,
          updatedAt: Date.now(),
        });
      }
    } else {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

// Get typing users for a conversation
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const TYPING_THRESHOLD = 3000; // 3 seconds
    const now = Date.now();

    const typingRecords = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return typingRecords
      .filter(
        (t) =>
          t.userId !== args.currentUserId &&
          now - t.updatedAt < TYPING_THRESHOLD
      )
      .map((t) => ({ userId: t.userId, userName: t.userName }));
  },
});
