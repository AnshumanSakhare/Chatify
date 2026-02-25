import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_name", ["name"]),

  // Conversations (1-on-1 or group)
  conversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group")),
    participantIds: v.array(v.string()), // clerkIds
    groupName: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_last_message_time", ["lastMessageTime"]),

  // Messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(), // clerkId
    content: v.string(),
    isDeleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_time", ["conversationId", "createdAt"]),

  // Message reactions
  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.string(), // clerkId
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_user", ["messageId", "userId"]),

  // Online presence
  presence: defineTable({
    userId: v.string(), // clerkId
    lastSeen: v.number(),
    isOnline: v.boolean(),
  })
    .index("by_user_id", ["userId"]),

  // Typing indicators
  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // clerkId
    userName: v.string(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  // Read receipts / unread counts
  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // clerkId
    lastReadTime: v.number(),
  })
    .index("by_conversation_and_user", ["conversationId", "userId"]),
});
