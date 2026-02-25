import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Upsert user profile from Clerk data
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        createdAt: Date.now(),
      });
    }
  },
});

// Get all users except the current user
export const getAllUsers = query({
  args: {
    currentUserId: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();
    users = users.filter((u) => u.clerkId !== args.currentUserId);

    if (args.search && args.search.trim() !== "") {
      const searchLower = args.search.toLowerCase();
      users = users.filter((u) =>
        u.name.toLowerCase().includes(searchLower)
      );
    }

    return users;
  },
});

// Get user by clerkId
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get multiple users by clerkIds
export const getUsersByClerkIds = query({
  args: { clerkIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => args.clerkIds.includes(u.clerkId));
  },
});
