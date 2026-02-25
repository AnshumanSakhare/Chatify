import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update user presence (heartbeat)
export const updatePresence = mutation({
  args: {
    userId: v.string(),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        isOnline: args.isOnline,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: args.userId,
        lastSeen: Date.now(),
        isOnline: args.isOnline,
      });
    }
  },
});

// Get online status for a list of user IDs
export const getPresenceForUsers = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allPresence = await ctx.db.query("presence").collect();
    const ONLINE_THRESHOLD = 30000; // 30 seconds
    const now = Date.now();

    return allPresence
      .filter((p) => args.userIds.includes(p.userId))
      .map((p) => ({
        userId: p.userId,
        isOnline: p.isOnline && now - p.lastSeen < ONLINE_THRESHOLD,
        lastSeen: p.lastSeen,
      }));
  },
});

// Get all online users
export const getAllOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const allPresence = await ctx.db.query("presence").collect();
    const ONLINE_THRESHOLD = 30000;
    const now = Date.now();
    return allPresence
      .filter((p) => p.isOnline && now - p.lastSeen < ONLINE_THRESHOLD)
      .map((p) => p.userId);
  },
});
