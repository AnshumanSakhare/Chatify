import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create a direct conversation between two users
export const getOrCreateDirectConversation = mutation({
  args: {
    currentUserId: v.string(),
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Look for existing direct conversation between these two users
    const allConversations = await ctx.db
      .query("conversations")
      .collect();

    const existing = allConversations.find(
      (c) =>
        c.type === "direct" &&
        c.participantIds.includes(args.currentUserId) &&
        c.participantIds.includes(args.otherUserId) &&
        c.participantIds.length === 2
    );

    if (existing) return existing._id;

    // Create a new one
    const id = await ctx.db.insert("conversations", {
      type: "direct",
      participantIds: [args.currentUserId, args.otherUserId],
      createdAt: Date.now(),
    });

    return id;
  },
});

// Create a group conversation
export const createGroupConversation = mutation({
  args: {
    currentUserId: v.string(),
    memberIds: v.array(v.string()),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    const allParticipants = [
      args.currentUserId,
      ...args.memberIds.filter((id) => id !== args.currentUserId),
    ];

    const id = await ctx.db.insert("conversations", {
      type: "group",
      participantIds: allParticipants,
      groupName: args.groupName,
      createdAt: Date.now(),
    });

    return id;
  },
});

// Get all conversations for a user
export const getConversationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();

    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    // Sort by lastMessageTime descending
    userConversations.sort((a, b) => {
      const timeA = a.lastMessageTime ?? a.createdAt;
      const timeB = b.lastMessageTime ?? b.createdAt;
      return timeB - timeA;
    });

    return userConversations;
  },
});

// Get a single conversation by ID
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
